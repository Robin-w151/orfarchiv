# 05: Per-target content opt-out

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 04
**Estimate:** M

## User story
As the operator, I want to mark database targets that must not hold content embeddings, so that the Atlas M0 fallback stays under its 512 MB ceiling while the VPS gets the full feature.

## Description
**One env variable across all modules:** `ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS`, a `;`-separated list of target labels (the same labels `labelOf` produces, for example `<cluster>.mongodb.net`). It defaults to empty, meaning every target gets content.

- **`shared/src/targets/targets.ts`:** extend `Target` with `content: boolean`. Add `parseTargets(raw, excludedContentLabels?)` or a separate `withContentCapability(targets, rawExcluded)`, whichever reads better. Warn (return the unknown labels) when an excluded label matches no target, so typos show up.
- **scraper:**
  - Read the variable in `scraper/src/services/env.ts`.
  - Content writes (story 06) go only to targets with `content: true`.
  - `scrape`'s `buildStoryUpdate` doesn't touch content fields on any target.
  - `targets` prints the capability per target.
- **db:**
  - `setup` builds both index lists from `{ content }` (`searchIndexes` and `indexes` in `db/src/shared/model.ts`). Excluded targets get the title-only `news_title_vector` and no `content_status_timestamp`. A target whose existing index doesn't match its expected definition is handled like any changed definition (fail, or `--recreate-search-indexes`).
  - `sync` passes `SYNC_FIELDS` without `contentEmbedding` and `contentStatus` to `upsertNews` when the destination is excluded. `toUpsert` only `$set`s the fields it gets, so nothing is unset.
  - `verify`:
    - expects the index lists per target;
    - flags any `contentEmbedding` **or** `contentStatus` on an excluded target as a problem;
    - compares missing-content counts only among content-enabled targets, for information only.
  - `targets` prints the capability per target.
- **ui:**
  - Read the variable in `ui/src/env.ts`.
  - `useNewsCollection`'s callback in `ui/src/lib/backend/db/database.ts` receives the target it runs against: `use(newsCollection, target)`, with `target.content` from `shared`. Today the target is picked inside `Effect.firstSuccessOf`, and the same callback is retried on the next target after a failure. Story 08 builds the fused or title-only pipeline inside the callback, so a failover to an excluded target automatically runs title-only search. Existing callers ignore the second argument.
  - Document the variable in the `ui` README as required in production once fused search is on (`ui` has no `.env.example`). Story 09 sets it in Vercel.

Update the README env sections in `scraper`, `db` and `ui`.

## Acceptance criteria
- [ ] Given `ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS=orfarchiv-db-2` locally, when `db setup` runs, then `orfarchiv-db-2` has a title-only index and `orfarchiv-db-1` has both paths.
- [ ] `db sync --from <db-1> --to <db-2>` leaves no `contentEmbedding` on db-2, and `db verify` is green.
- [ ] Inserting a `contentEmbedding` on db-2 by hand makes `db verify` exit 1 with a problem naming the label.
- [ ] Setting `contentStatus: 'failed'` on a db-2 story by hand makes `db verify` exit 1.
- [ ] `orfarchiv-db-2` has no `content_status_timestamp` index after `setup`, and `verify` doesn't report it as missing.
- [ ] An excluded label that matches no target logs a warning in every module.
- [ ] Given db-1 is down and db-2 is excluded, when `useNewsCollection` fails over, then the callback is called again with `target.content === false` (spec in `database.spec.ts`).
- [ ] Lint and tests are green in `shared`, `scraper`, `db` and `ui`.

## Technical notes
- Label parsing: `shared/src/targets/targets.ts` (`parseTargets`, `labelOf`). Env loading: `scraper/src/services/env.ts`, `db/src/services/env.ts`, `ui/src/env.ts`.
- db: `db/src/shared/model.ts` (`searchIndexes` and `indexes` become functions of `{ content }`), `db/src/services/{setup,sync,verify,targets}.ts`.
- UI failover: `ui/src/lib/backend/db/database.ts` and `database.spec.ts`.
- Local labels: `orfarchiv-db-1` and `orfarchiv-db-2` (the hosts in `db/.env`'s `ORFARCHIV_DB_URLS`).

## Testing
- Unit: target parsing with and without exclusions and with an unknown label; per-target index definitions; sync projection; verify problems; UI capability on failover.

## Out of scope
- Writing content (story 06) and using it in search (story 08).
