# 04: Content embedding schema and index

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** 03
**Estimate:** M

## User story
As a developer, I want the content embedding field, its dimension, its input format and its index path defined once in `shared` and applied by `db setup`, so that the scraper, db and UI agree on the schema.

## Description
**In `shared/src/search/` (constants in `search.constants.ts`, `toContentDocumentInput` in `search.ts`), add:**
- `CONTENT_EMBEDDING_FIELD = 'contentEmbedding'`.
- `CONTENT_EMBEDDING_DIMENSIONS = <value from story 03>`.
- `CONTENT_STATUS_FIELD = 'contentStatus'` and its values as a const object:
  ```ts
  export const CONTENT_STATUS = {
    embedded: 'embedded',
    failed: 'failed',
  } as const;
  export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS];
  ```
  `embedded`: `contentEmbedding` is written. `failed`: terminal failure (page 404/410, not an article, or nothing extracted); the reason only goes to the job log. A missing field means "not processed yet".
- `toContentDocumentInput(title: string, body: string): string`, which returns `title: <title> | text: <body>`. Truncation to the token limit happens in the scraper, because it needs the tokenizer.
- `NEWS_TITLE_VECTOR_INDEX` keeps its name. Renaming it would force a drop and recreate and is not worth it. Add a short note to the epic README that the name is historical.

**In `db/src/shared/model.ts`:**
- Add `{ type: 'vector', path: CONTENT_EMBEDDING_FIELD, numDimensions: CONTENT_EMBEDDING_DIMENSIONS, similarity: 'cosine' }` to the `news_title_vector` definition.
- Add the index `{ [CONTENT_STATUS_FIELD]: 1, timestamp: -1 }` (name `content_status_timestamp`). Story 06 selects its backlog with `{ contentStatus: null }` (matches missing fields and uses the index), sorted by `timestamp: -1`. Without it, the `timestamp` index would be walked past every already-processed story, so near the end of the backfill each tick would scan almost all 437k documents; a partial index can't help, because `partialFilterExpression` doesn't support `$exists: false`.

**In `db/src/services/setup.ts`:**
- Today a changed search index definition makes `setup` fail with a `SetupError`, unless `--recreate-search-indexes` is passed, which drops and recreates it ([setup.ts](../../db/src/services/setup.ts) `reconcileSearchIndexes`). That stays: vector indexes **can't be updated in place** on atlas-local 8.3.3. Re-tested on 2026-10-06 with `mongodb@7.6.0` on a scratch database, confirming epic 0001 story 03: `updateSearchIndex` fails with `"mappings" is required` (driver call, raw command, `type` inside the definition) or `BSON field 'updateSearchIndex.type' is an unknown field`. Semantic search is unavailable until the recreated index is queryable again.
- Add `--wait-until-queryable`. After every create or recreate, `setup` polls `listNewsSearchIndexes` with an exponential backoff (first check after 1 s, delay doubling each time, capped at 30 s) until the index reports `queryable: true` and `status: 'READY'`, and logs the status on every check. It fails with `SetupError` if the status becomes `FAILED` or the wait exceeds `--wait-timeout` (default `30 minutes`, a `Duration` string). Without the flag, `setup` returns right after issuing the create, as today. Implement the polling with `Effect.repeat` and a `Schedule` (`Schedule.exponential('1 second')` combined with a 30 s cap) rather than a manual loop.

**In `db/src/services/database.ts`:**
- Add `CONTENT_EMBEDDING_FIELD` and `CONTENT_STATUS_FIELD` to `SYNC_FIELDS`, so `db sync` copies them. Story 05 restricts this per target.
- `streamAllNews` (used by `db backup`) also projects out `CONTENT_EMBEDDING_FIELD`. The backup then drops `contentStatus: 'embedded'` from each document (in the stream mapping, since a find projection can't mix exclusions with a conditional field) and keeps `contentStatus: 'failed'`. After a restore, `embed-content` re-embeds those stories but doesn't re-fetch pages known to be dead.

**In `db/src/services/verify.ts`:** report `missingContent` (stories without `contentStatus`) for information only, **not** as a divergence. Targets legitimately differ while the backfill runs, and story 05 adds per-target expectations.

Bump the nested `shared` submodule in `db`, `scraper` and `ui`.

## Acceptance criteria
- [x] Given a fresh local DB, when `npm start -- setup` runs in `db`, then `news_title_vector` has both vector paths and the three filters. (No flag for a scratch DB name: covered by the `setup.spec` create case, and the create call with the same definition left both local targets with `titleEmbedding:256`, `contentEmbedding:512` and the three filters.)
- [x] Given an existing local DB with the old definition, when `setup` runs without flags, then it exits 1 with the existing "definition changed" `SetupError` and the index is untouched.
- [x] Given the same DB, when `setup --recreate-search-indexes --wait-until-queryable` runs, then it exits 0 only after `news_title_vector` is `READY` and queryable with both vector paths, and logs the time it took.
- [x] Given `--wait-timeout "1 second"` on the full local collection (Effect's duration parser rejects `1s`), then `setup` exits 1 with a timeout `SetupError` naming the index, and the index keeps building.
- [x] `db sync` copies `contentEmbedding` and `contentStatus` between two local targets.
- [x] On the local full copy (443k stories), `explain()` of `find({ contentStatus: null }).sort({ timestamp: -1 }).limit(20)` shows an `IXSCAN` on `content_status_timestamp` and `totalDocsExamined` ≤ 20, also after setting `contentStatus: 'embedded'` on the newest 100k stories.
- [x] Given a target with embedded and failed stories, when `db backup` runs, then the backup has no `contentEmbedding`, no `contentStatus: 'embedded'`, and keeps `contentStatus: 'failed'`.
- [x] `db verify` prints the missing-content count per target and doesn't fail on differing counts.
- [x] `shared` and `db`: lint and tests are green, and `searchIndexDefinitionMatches` specs cover the two-path definition.

## Technical notes
- Files: `shared/src/search/{search,search.constants}.ts`, `db/src/shared/model.ts`, `db/src/services/{setup,database,verify}.ts`, plus their specs.
- Polling: `connection.listNewsSearchIndexes()` already returns `status`, `queryable` and `latestDefinition`. Reuse it.
- Story 01 measures how long the rebuild takes on the full collection. Story 07 plans the outage window from that.
- **As implemented (2026-10-12):**
  - `shared` was restructured into feature folders at the user's request: `src/{embedding,search,storyContent,targets}/`, with constants in `<feature>.constants.ts`. The schema constants live in `search/search.constants.ts`, and consumers import `#common/search/search.constants` (`$common/…` in `ui`). The fixtures moved to `src/storyContent/fixtures/` (the consumers' `.prettierignore` and `db/tsconfig.json` were updated to match).
  - Waiting: the first check runs right after the create, and then the delays 1 s, 2 s, 4 s … are capped at 30 s (`Effect.repeat` with `Schedule.min([exponential('1 second'), spaced('30 seconds')])`). An index counts as ready only when its `latestDefinition` also matches. This is needed because right after drop + create, the old READY entry can still be listed.
  - `--wait-until-queryable` also waits for an index that is up to date but still building, so a rerun after a timeout waits instead of returning at once.
  - A failed `listSearchIndexes` call during the wait is logged as a warning and polled again. Locally, mongot briefly refused connections (`Error connecting to Search Index Management service`) during a full-collection build. The timeout still bounds the wait.
  - `streamAllNews` maps documents through `toBackupStory`, which drops `contentStatus: 'embedded'`. `countNewsWithoutContentStatus` counts with `{ contentStatus: null }`.
  - Measured locally (443k stories): the recreate with both paths took 15 s until queryable, and creating `content_status_timestamp` took < 1 s.

## Testing
- New spec `db/src/shared/model.spec.ts`: two-path definition, `content_status_timestamp` index, `searchIndexDefinitionMatches`.
- New spec `db/src/services/setup.spec.ts`: create / up to date / fail / recreate, and the wait (ready, `FAILED`, timeout, and the backoff delays 1 s, 2 s, 4 s … capped at 30 s, all with `TestClock`), using a stub `DatabaseConnection` layer. `db` has no setup specs yet; its only spec is `src/shared/retention.spec.ts`.
- Backup mapping and the verify count: unit specs next to their services.
- Manual: run against the devcontainer's `orfarchiv-db-1`.

## Out of scope
- Excluding M0 (story 05).
- Writing content embeddings (story 06).
