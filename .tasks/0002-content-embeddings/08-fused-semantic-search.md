# 08: Fused semantic search in UI

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** 04, 05
**Estimate:** L

## User story
As a reader using semantic search, I want results that match what the article is about, not only its headline, so that I find stories whose topic is only mentioned in the body.

## Description
Extend `ui/src/lib/backend/search/semantic.ts`.

**Query vector.** Change `EmbeddingService.embedQuery` (`ui/src/lib/backend/search/embedding.ts`) to return both vectors from **one** request: `{ title: quantize(values.slice(0, TITLE_EMBEDDING_DIMENSIONS)), content: quantize(values.slice(0, CONTENT_EMBEDDING_DIMENSIONS)) }`. Validate `values.length >= max(...)`. The LRU cache stores the pair.

**Mode selection** happens inside the `useNewsCollection` callback, which receives the target it runs against (story 05):
- **Fused** when `ORFARCHIV_SEMANTIC_CONTENT_ENABLED === 'true'` and `target.content`.
- **Title-only** otherwise: exactly today's pipeline, unchanged.

A failover to an excluded target therefore runs title-only automatically.

**Fused pipeline** (MongoDB 8.3.3 supports `$rankFusion`; tested on a scratch DB on 2026-10-11):
1. `$rankFusion` with the sub-pipelines `title` and `content`. Each is a `$vectorSearch` (on `titleEmbedding` with the title vector, on `contentEmbedding` with the content vector) with the same `filter` from `buildVectorFilter`, `numCandidates` and `limit`, followed by `{ $match: { title: { $gt: '' } } }`. Weights are `SEMANTIC_SEARCH_TITLE_WEIGHT` / `SEMANTIC_SEARCH_CONTENT_WEIGHT` (start at 1 / 1), with `scoreDetails: true`.
2. `$addFields`: `fusedScore: { $meta: 'score' }` and `details: { $meta: 'scoreDetails' }`. `details.details` holds one entry per list the story came from, with `inputPipelineName`, `rank` and the raw vector score in `value`.
3. The score floor as a `$match` with `$expr` (see Thresholds).
4. Today's `rankScore` recency boost applied to `fusedScore`, then `$sort` and `$limit`.

**Thresholds.**
- A story is kept if its title score ≥ `SEMANTIC_SEARCH_TITLE_MIN_SCORE` **or** its content score ≥ `SEMANTIC_SEARCH_CONTENT_MIN_SCORE` (initial value from a quick local check, tuned in story 09), so weak content matches don't flood the results.
- The floors can't run inside the `$rankFusion` sub-pipelines: only stages that retrieve, limit or order documents are allowed there (`$addFields` is rejected), and `$match` with `{ $meta: 'vectorSearchScore' }` fails with `query requires $vectorSearch score metadata, but it is not available`. They are applied after fusion on the per-list raw scores from `scoreDetails`.
- The recency boost multiplies the fused score in the same way it multiplies `score` today.

**Robustness.**
- If the fused query fails with an error that indicates a missing path or index (as classified in story 01), log it once with the target label and a hint to check `ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS`, and fall back to title-only for that request. This is a safety net for misconfiguration; the normal path is the mode selection above.
- Results keep `ordering: 'relevance'` and the `News` shape, so the frontend needs no change.

**Config:** new constants in `ui/src/lib/configs/server.ts`. New env variable `ORFARCHIV_SEMANTIC_CONTENT_ENABLED` in `ui/src/env.ts`, defaulting to off.

## Acceptance criteria
- [x] Given the flag is off, then the aggregation sent to MongoDB is identical to today's (asserted in a spec).
- [x] Given the flag is on and the target has content, then exactly one embedding request is made, and the pipeline queries both paths with the same filter.
- [x] Given the flag is on and the serving target is excluded (failover to M0), then title-only search runs and no error is shown.
- [x] Given a story that matches only through its content (local fixture), then it appears in fused results and not in title-only results. (Local data on db-1 instead of a fixture file: for `Hochwasser`, „Dutzende Tote bei Unwettern in Nepal und Indien“ has content score 0.805 and no title hit, and appears only in fused results.)
- [x] Tag, date and source filters behave identically in both modes.
- [x] A story whose title and content scores are both below their floors never appears in fused results; a story above only the content floor does.
- [x] On the local full copy, the p95 server-side duration of 20 fused queries is at most 2× that of the same queries title-only (embedding request excluded, timed around the aggregation). (db-1: title-only p95 20 ms, fused p95 28 ms, ratio 1.38, with only ≈ 350 content vectors.)
- [x] `npm run lint`, `npm run check`, `npm run test:unit` and `npm run test:e2e` are green in `ui`, including updated `ui/tests/mocks/news.mocks.ts` and `ui/tests/specs/news.spec.ts` where relevant. (The response shape is unchanged, so the e2e mocks needed no change. e2e needs a running dev server and passed 75/75 with `--workers=2`; with the default worker count, image viewer and settings specs failed at random against the dev server, in specs this story doesn't touch.)

## Technical notes
- Files: `ui/src/lib/backend/search/{semantic,embedding}.ts` (+ `embedding.spec.ts`), `ui/src/lib/configs/server.ts`, `ui/src/env.ts`, `ui/src/lib/backend/db/database.ts` (capability from story 05).
- Shared constants: `CONTENT_EMBEDDING_FIELD` and `CONTENT_EMBEDDING_DIMENSIONS` from `$common/search`.
- Keep the existing `$addFields` / `$match` / `rankScore` style. `$rankFusion` reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion/
- **As implemented (2026-10-13):**
  - `embedQuery` returns `QueryVectors { title, content }` and requires `max(256, 512)` dimensions. `semantic.ts` builds both pipelines from shared helpers (`vectorSearchStage`, `rankStages`), so the title-only pipeline is unchanged. The sub-pipeline names are a const object `FusionPipeline` (`Title: 'title'`, `Content: 'content'`).
  - Floors: `titleScore` / `contentScore` are read from `details.details` by `inputPipelineName` (`$first` of `$filter` → `value`, default 0, because a list a story is missing from has only `rank: 'NA'` and no `value`), then `$match` with `$expr` / `$or`. Checked on mongod with `$documents`: title only, content only and both are kept; neither is dropped.
  - Review follow-ups: `SEMANTIC_SEARCH_MIN_SCORE` was renamed to `SEMANTIC_SEARCH_TITLE_MIN_SCORE`. The fused pipeline sorts ties by `timestamp: -1, _id: -1`, because RRF gives a story at rank *r* in only one list exactly the same score as a story at rank *r* in only the other list. It also ends with a `$project` that drops both embeddings and `details`. Title-only search is unchanged apart from the constant name.
  - `SEMANTIC_SEARCH_CONTENT_MIN_SCORE = 0.76` (initial value). On db-1's ≈ 350 content stories, relevant content hits scored ≈ 0.76–0.81 and unrelated ones ≈ 0.68–0.75. Content scores run lower than title scores.
  - Fallback: an error whose message contains `is not indexed as vector` is caught inside the `useNewsCollection` callback, so the target is not marked down. The callback then runs title-only and warns once per target label. Inside `$rankFusion` the error is the same as in story 01 (`MongoServerError` code 8, `<path> is not indexed as vector`).
  - Manual comparison of 10 queries through the API (flag off / on, db-1): fused search adds 0–23 stories per query, mostly relevant content-only matches (for example `Spritpreise` → „Wie man am besten Sprit sparen kann“). Top-10 order changes a lot, because RRF ranks by position and the few content stories get pushed up (the epic's partial-coverage risk). A few weak content hits pass the floor (`Mietpreise Wien` → „Verbund hebt Strompreis für Neukunden an“). Both are input for story 09.
  - While this story was being worked on, local `orfarchiv-db-2` changed from a title-only index without content to the two-path index with content vectors, outside this story. The excluded-target path is therefore covered by unit specs and the story 05 failover spec, not by a run against db-2.

## Testing
- Unit: mode selection, pipeline construction for both modes, the score floor on `scoreDetails` (title only, content only, both, neither), and the fallback on a missing path.
- Manual: run the UI against the devcontainer DB after story 06's local run, and compare 10 queries with the flag on and off.

## Out of scope
- Choosing final weights and thresholds, and enabling the feature in production (story 09).
- UI changes such as showing why a result matched.
