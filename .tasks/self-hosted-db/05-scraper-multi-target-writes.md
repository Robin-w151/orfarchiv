# S5 — `scraper`: multi-target writes

**Owner:** Me   **Repo:** `scraper`   **Size:** M
**Depends on:** [S2](02-shared-module.md)   **Blocks:** [S10](10-enable-dual-writes.md)
**Status:** ✅ Done (2026-09-26) — verified against two live atlas-local instances, see [Result](#result-2026-09-26)

## Goal

Make the scraper persist every scrape to **all configured database targets**, computing embeddings
once, and tolerating the failure of any individual target.

## Why

This is the mechanism that keeps the targets in agreement — it is how "keep the M0 cluster up to
date as a fallback" is actually implemented, and later how a second self-hosted instance
([S13](13-optional-second-target.md)) stays current. Without it, every database but one goes stale.

## Scope

**In scope**

- `dbConnectionUrls` in the environment service.
- `persistOrfNews` and `backfillEmbeddings` writing to N targets.
- `--target` to restrict a run to one database.

**Out of scope**

- Actually configuring a second target in production — that is
  [S10](10-enable-dual-writes.md). This ships with `ORFARCHIV_DB_URLS` unset and is a no-op.

## Technical notes

The substantive change is `src/services/database.ts`.

### Environment

`src/services/env.ts` gains `dbConnectionUrls` using the same `loadEnvVariable` chain (`_FILE` →
env → fallback). It already returns an `Effect` re-read per connection acquisition, so no
restructuring is needed there.

### Connections

`orfArchivDbConnection()` becomes `orfArchivDbConnections()`: acquire all targets in parallel, each
wrapped in `Effect.result`. **A target that fails to connect is logged and skipped, not fatal.** The
release step closes every client that was actually opened.

Keep the existing `Effect.acquireRelease` + `Effect.scoped` shape — a fresh connection per scrape
tick is fine for a once-a-minute job and avoids idle-connection handling.

### `persistOrfNews` — ordering matters

Embeddings are the expensive part and must be computed **once**, not per target. But each target can
legitimately be in a different state, so the insert/update split has to be computed per target. The
resulting order:

1. **Per target:** `find({ id: { $in: storyIds } })` → that target's insert set and update set.
2. **Once:** union the titles needing embedding across *all* targets → a single `embedTitlesById`
   call → one shared `Map<id, Binary>`.
3. **Per target, in parallel:** `insertMany` + `bulkWrite`, each wrapped in `Effect.result`.
4. Log per target. Fail the whole effect **only if every target failed**.

Step 4 matters: the `--poll` loop already wraps each tick in `Effect.catchCause(logCause)`, so a
total outage still surfaces, while a single-database blip becomes a warning and the other databases
still get their writes.

Existing semantics to preserve exactly: `storyShouldUpdate` fires on changed `title`, `category` or
`url`; `buildStoryUpdate` re-embeds retitled stories and `$unset`s `titleEmbedding` when a title
changed but embedding failed.

### `backfillEmbeddings`

Each target has its own set of documents missing embeddings. Process targets **sequentially** with a
run-scoped `Map<title, Binary>` memo, so a title missing on two targets is embedded once. Sequential
rather than parallel here because the embedding server is the bottleneck and is already rate-limited.

### `--target`

Restricts a run to one database. Needed to backfill a newly added target without re-scanning the
others — [S8](08-seed-and-parity.md) and [S13](13-optional-second-target.md) both want this.

## Acceptance criteria

- [x] With `ORFARCHIV_DB_URLS` unset, behaviour is identical to today.
- [x] With two targets, one scrape writes the same stories to both.
- [x] Embeddings are computed **once** per scrape regardless of target count (assert on the number of
      embedding-server calls, not just the result).
- [x] Two targets in different states each receive the correct insert/update set.
- [x] One unreachable target: the other still receives writes, the run exits successfully, an error is
      logged naming the failed target.
- [x] All targets unreachable: the run fails and the cause surfaces through `logCause`.
- [x] `--target <label>` restricts writes to one database.
- [x] `backfillEmbeddings` embeds a title shared by two targets only once.
- [x] Credentials appear in no log line.
- [x] `npm run lint` and `npm run test` pass.

## Verification

Vitest specs alongside the existing `src/services/*.spec.ts`:

- two targets in different states → correct per-target insert/update sets
- embedding call count is independent of target count
- one target failing still commits the other
- all targets failing propagates a `DatabaseError`

Integration, with two atlas-local instances in the devcontainer:

```bash
cd scraper
npm run test && npm run lint

ORFARCHIV_DB_URLS="<A>
<B>" npm start -- --debug          # single run, not --poll

# both should hold the same story ids
mongosh "<A>" --eval 'db.news.countDocuments()'
mongosh "<B>" --eval 'db.news.countDocuments()'

docker stop <B-instance>
ORFARCHIV_DB_URLS="<A>
<B>" npm start -- --debug          # exits 0, warns about B
docker start <B-instance>
```

Then `db verify` ([S4](04-db-sync-and-verify.md)) should report the expected drift, and
`db sync` should repair it — this is the first end-to-end exercise of the write/repair loop.

## Risks / open questions

- Writing to N targets multiplies scrape-tick latency if targets are slow. The writes are parallel,
  so the tick costs roughly the slowest target, not the sum — but a hung target could stall a tick
  until the driver's timeout. Consider an explicit per-target write timeout inside the 5-minute
  overall `Effect.timeout` that already wraps `scrapeNews`.

## Result (2026-09-26)

Implemented in `scraper` on branch `self-hosted-db`. `npm run lint`, `npm run test` (67 tests) and
`npm run build` pass.

> **Breaking CLI change — relevant for [S10](10-enable-dual-writes.md).** The scraper now uses
> subcommands: `scraper --poll` became `scraper scrape --poll`, and `scraper --backfill-embeddings`
> became `scraper backfill-embeddings`. The Dockerfile's default `CMD` is updated to
> `["scrape", "--poll"]`. Any deployment that overrides the command (e.g. `--poll --cron …`) must
> prefix it with `scrape`.

### What changed

| Area | Change |
| --- | --- |
| Targets | `Environment.dbTargets` (`ORFARCHIV_DB_URLS` via `loadEnvVariable`, falls back to `ORFARCHIV_DB_URL`) and a `Targets` service with `select(label)`, both copied from `db`. Unknown labels fail with `TargetError` listing the available ones |
| `persistOrfNews` | Connects to all targets in parallel; per target, reads the existing stories and plans inserts/updates; embeds the union of new and retitled stories **once**; writes to all targets in parallel. Failed targets are logged by label and skipped; fails with `DatabaseError` only if every target failed. `storyShouldUpdate` and `buildStoryUpdate` are unchanged |
| Per-target timeout | `DB_TARGET_TIMEOUT` (1 minute) wraps each target's read and write step, inside the existing 5-minute tick timeout |
| `backfillEmbeddings` | Targets run sequentially, each with its own connection scope. With more than one target, a run-scoped `Map<title, Binary>` memo embeds shared titles once. `--max-docs` applies per target. Fails only if every target failed |
| CLI | Moved from `meow` to `effect/unstable/cli`, structured like `db`: `src/commands/{scraper,scrape,backfill,targets,index}.ts`. Shared flags `--target` and `--debug`; new `targets` subcommand lists the labels. `services/command.ts` is removed |
| Exit code | A failed run exits 1 (it exited 0 before). In `--poll` mode a failed tick is only logged, so it can't turn a later clean shutdown into exit 1 |
| Logging | `LoggerLive` redacts every line with `redact()` from `#common/targets` |
| Dev config | `.env` sets `ORFARCHIV_DB_URLS` to `orfarchiv-db-1` and `orfarchiv-db-2`, like `db/.env` |
| Docs | README sections for running the scraper and backfilling embeddings |

### Deviations

- **`dbTargets`, not `dbConnectionUrls`,** to match `db`. It returns labelled `Target`s rather than
  raw URLs.
- **The CLI moved to subcommands** (see the note above). The task only asked for `--target`.
- **A healthy target waits for an unreachable one.** All targets are read before the single
  embedding call, so while one target is down the others write after the driver's ~30 s
  server-selection timeout. That is well inside the 5-minute tick.

### Verified

Against `orfarchiv-db-1` and `orfarchiv-db-2` in the devcontainer. `db setup` first created the
missing `url_asc` and `source_asc` indexes on both, so `db verify` reflects only data drift.

- **Both up:** both targets received the same 255 inserts and 2 updates, with embeddings;
  `db verify` reports "All 2 targets agree".
- **Drift:** the 3 newest `news` stories were deleted from both, then `docker stop orfarchiv-db-2`.
  `scrape` exited 0, logged an error naming `orfarchiv-db-2`, and re-inserted the 3 stories into
  `orfarchiv-db-1` only.
- **All targets down** (`--target orfarchiv-db-2` while stopped): "Failed to persist stories to
  any database target" is logged through `logCause`, exit 1.
- **Backfill with db-2 down:** db-1 completed, db-2's failure was logged, run exit 0.
- **Repair:** after `docker start orfarchiv-db-2`, `db verify` reported 443,124 vs 443,127 stories
  (exit 1). `db sync --from orfarchiv-db-1 --to orfarchiv-db-2 --since 2026-09-26T00:00:00Z`
  inserted 3 and left 151 unchanged; `db verify` then agreed, embeddings included.
- **`--target`:** restricts writes to one target; an unknown label lists the available ones.
- **`ORFARCHIV_DB_URLS` unset:** falls back to the single `ORFARCHIV_DB_URL`.
- **Credentials:** none in any log, including driver errors for credentialed URLs.
- **Exit codes** (built bundle): success 0, one target failed 0, all targets failed 1, unknown
  target 1, invalid flag 1, `--help` 0, `scrape --poll` interrupted 130.
- **Specs** cover per-target insert/update sets, one embedding call for 1 and 3 targets,
  connect/find/write failures of one target, all targets failing, client cleanup, credential
  redaction, backfill memoization, and target selection including the env fallback. The
  shared-title backfill case was not exercised live, because the dev databases had nothing to
  backfill.
