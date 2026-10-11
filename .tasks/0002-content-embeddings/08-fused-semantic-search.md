# 08: Fused semantic search in UI

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Todo
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
- A story is kept if its title score ≥ `SEMANTIC_SEARCH_MIN_SCORE` **or** its content score ≥ `SEMANTIC_SEARCH_CONTENT_MIN_SCORE` (initial value from a quick local check, tuned in story 09), so weak content matches don't flood the results.
- The floors can't run inside the `$rankFusion` sub-pipelines: only stages that retrieve, limit or order documents are allowed there (`$addFields` is rejected), and `$match` with `{ $meta: 'vectorSearchScore' }` fails with `query requires $vectorSearch score metadata, but it is not available`. They are applied after fusion on the per-list raw scores from `scoreDetails`.
- The recency boost multiplies the fused score in the same way it multiplies `score` today.

**Robustness.**
- If the fused query fails with an error that indicates a missing path or index (as classified in story 01), log it once with the target label and a hint to check `ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS`, and fall back to title-only for that request. This is a safety net for misconfiguration; the normal path is the mode selection above.
- Results keep `ordering: 'relevance'` and the `News` shape, so the frontend needs no change.

**Config:** new constants in `ui/src/lib/configs/server.ts`. New env variable `ORFARCHIV_SEMANTIC_CONTENT_ENABLED` in `ui/src/env.ts`, defaulting to off.

## Acceptance criteria
- [ ] Given the flag is off, then the aggregation sent to MongoDB is identical to today's (asserted in a spec).
- [ ] Given the flag is on and the target has content, then exactly one embedding request is made, and the pipeline queries both paths with the same filter.
- [ ] Given the flag is on and the serving target is excluded (failover to M0), then title-only search runs and no error is shown.
- [ ] Given a story that matches only through its content (local fixture), then it appears in fused results and not in title-only results.
- [ ] Tag, date and source filters behave identically in both modes.
- [ ] A story whose title and content scores are both below their floors never appears in fused results; a story above only the content floor does.
- [ ] On the local full copy, the p95 server-side duration of 20 fused queries is at most 2× that of the same queries title-only (embedding request excluded, timed around the aggregation).
- [ ] `npm run lint`, `npm run check`, `npm run test:unit` and `npm run test:e2e` are green in `ui`, including updated `ui/tests/mocks/news.mocks.ts` and `ui/tests/specs/news.spec.ts` where relevant.

## Technical notes
- Files: `ui/src/lib/backend/search/{semantic,embedding}.ts` (+ `embedding.spec.ts`), `ui/src/lib/configs/server.ts`, `ui/src/env.ts`, `ui/src/lib/backend/db/database.ts` (capability from story 05).
- Shared constants: `CONTENT_EMBEDDING_FIELD` and `CONTENT_EMBEDDING_DIMENSIONS` from `$common/search`.
- Keep the existing `$addFields` / `$match` / `rankScore` style. `$rankFusion` reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion/

## Testing
- Unit: mode selection, pipeline construction for both modes, the score floor on `scoreDetails` (title only, content only, both, neither), and the fallback on a missing path.
- Manual: run the UI against the devcontainer DB after story 06's local run, and compare 10 queries with the flag on and off.

## Out of scope
- Choosing final weights and thresholds, and enabling the feature in production (story 09).
- UI changes such as showing why a result matched.
