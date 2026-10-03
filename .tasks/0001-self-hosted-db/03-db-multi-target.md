# S3 — `db`: multi-target config, `setup` / `backup` / `restore`

**Owner:** Me **Repo:** `db` **Size:** M
**Depends on:** [S2](02-shared-module.md) **Blocks:** [S4](04-db-sync-and-verify.md)
**Status:** ✅ Done (2026-09-16) — verified against two live atlas-local instances, see [Result](#result-2026-09-16-updated-2026-09-24)

## Goal

Teach the `db` CLI to address **N database targets**: `setup` reconciles indexes on all of them,
`backup` pulls from all of them, and `restore` writes to a chosen one.

## Why

`backup` pulling from every target is a hard requirement of the epic ("db backup can pull data from
multiple DBs"), and `setup` must be able to prepare a newly added database — including the VPS in
[S8](08-seed-and-parity.md). This story is also where the `--target` shared flag and target
resolution land, which [S4](04-db-sync-and-verify.md) then builds on.

## Scope

**In scope**

- `ORFARCHIV_DB_URLS` resolution with fallback to `ORFARCHIV_DB_URL`.
- `--target` as a `Command.withSharedFlags` flag across all subcommands.
- Per-target `setup` and `backup`; target selection for `restore`.
- The streamed backup writer.
- ~~The missing `dotenv.config()` fix.~~ Already done in [S1](01-db-cli-and-build.md).

**Out of scope**

- `sync` and `verify` ([S4](04-db-sync-and-verify.md)).
- Deploying with more than one target configured — that is [S10](10-enable-dual-writes.md). This
  ships with `ORFARCHIV_DB_URLS` unset, so it stays a production no-op.

## Technical notes

### Target resolution

The `Environment` service (`src/services/env.ts`) gains `dbConnectionUrls: Effect<string[]>`
alongside the existing `dbConnectionUrl`, reusing `loadEnvVariable` so the `_FILE` indirection
carries over. Parsing comes from `#common/targets` ([S2](02-shared-module.md)).

After [S1](01-db-cli-and-build.md) all MongoDB access already goes through the `Database` service
(`src/services/database.ts`). Its scoped `connect()` takes a target (`connect(target)`) instead of
reading `dbConnectionUrl` itself, so this is a small change rather than a consolidation.

Resolve targets **once at the root command** and pass them down, so every subcommand shares one
resolution path and one `--target` filter.

### `setup`

Loop `setupDb` (in the `Setup` service) over all targets. The existing index list and the
`news_title_vector` search index definition are unchanged.

~~**Fixes a live bug:** `setup.ts` never calls `dotenv.config()`.~~ Already fixed in
[S1](01-db-cli-and-build.md): `dotenv.config()` runs once in `src/index.ts`, so `setup` respects
`.env`/`.env.local`.

Note the existing `createSearchIndexes` only creates _missing_ indexes by name — it never updates a
changed definition, so a dimension change would silently no-op. Out of scope to fix, but worth a
comment in the code so S8 does not get surprised.

### `backup`

- One file per target: `<backupDir>/<label>/<timestamp>.json`.
- Per-target failure logs an error and **continues**; the run fails only if _every_ target failed.
- The 5-minute timeout applies **per target**, not to the whole run.

**Switch to a streamed write.** Today `find().toArray()` materialises all 436,710 documents and then
`JSON.stringify()` builds a single ~104 MB string — uncomfortably close to Node's string limit, and
about to run N× per night. Stream the cursor into a `createWriteStream`, emitting the same
`[{...},{...}]` array format so `restore` is unaffected:

```
write '['  ->  for each doc: write (first ? '' : ',') + JSON.stringify(doc)  ->  write ']'
```

Keep the existing `{ projection: { titleEmbedding: 0 } }` and `sort({ timestamp: -1 })`.

### `restore`

`--target` defaults to the **first** target — restore must never fan out by accident. `--all` is
opt-in. Existing `STORY_FIELDS` upsert semantics are unchanged: it copies only the six story fields,
converts `timestamp` back to a `Date`, and deliberately drops `_id` and `titleEmbedding`.

That embedding omission is intentional and is exactly why [S4](04-db-sync-and-verify.md) adds `sync`
— restoring a 437k-document backup into a fresh database would leave every embedding missing.

## Acceptance criteria

- [x] `ORFARCHIV_DB_URLS` parsed, ordered, with `_FILE` support; falls back to `ORFARCHIV_DB_URL`.
- [x] With `ORFARCHIV_DB_URLS` unset, backup output is **byte-identical** to S1. The file now lands in `<backupDir>/<label>/`, see Result.
- [x] `--target <label>` filters every subcommand to one database.
- [x] `setup` reconciles indexes on all targets; running it twice is a no-op.
- [x] `setup` now respects `.env` / `.env.local`. _(Done in [S1](01-db-cli-and-build.md).)_
- [x] `backup` writes one file per target under its own label directory.
- [x] One unreachable target does not prevent the others being backed up; the run fails only if all fail.
- [x] Streamed backup output parses back through `restore` unchanged.
- [x] `restore` without `--target` touches only the first target.
- [x] Connection credentials appear in **no** log line or filename.

## Verification

Use two atlas-local instances in the devcontainer (add a second service to
`.devcontainer/docker-compose.yml`) and point `ORFARCHIV_DB_URLS` at both.

```bash
cd db
npm run build

node dist/db.js setup                       # indexes on both
node dist/db.js backup                      # two files, two label dirs
ls -R .backup/

docker stop <second-instance>
node dist/db.js backup                      # first still succeeds, exit 0, error logged for second
docker start <second-instance>

node dist/db.js restore .backup/<label>/<file>.json --dry-run
node dist/db.js backup --target <label>     # only that one

grep -ri "password\|@.*:.*@" .backup/ && echo "LEAK" || echo "no credentials in output"
```

Also confirm memory behaviour: the streamed backup of the full 437k-document collection should not
show the RSS spike the old `toArray()` + `stringify()` path produces.

## Risks / open questions

- Backup disk growth is now N× per night. [S12](12-monitoring-and-scheduled-verify.md) adds disk
  monitoring; consider whether a retention policy belongs there too (currently nothing prunes
  `.backup/`).

## Result (2026-09-16, updated 2026-09-24)

Implemented in `db` on branch `self-hosted-db`. `npm run lint` and `npm run build`
pass.

### What changed

| Area                   | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Targets                | `Environment.dbTargets` (`ORFARCHIV_DB_URLS` via `loadEnvVariable`, falls back to `ORFARCHIV_DB_URL`); new `Targets` service with `select(label)`, which fails with `TargetError` listing the available labels                                                                                                                                                                                                                                                                      |
| CLI                    | The bare root command `dbCommand` with the shared `--target` flag lives in `src/commands/db.ts`, and the subcommands import it from there. `src/commands/index.ts` attaches the subcommands and exports `mainCommand`, which `src/index.ts` runs. Each subcommand resolves its targets through `Targets`                                                                                                                                                                            |
| `Database`             | `connect(target)`; `streamAllNews()` replaces `findAllNews()` and reads with cursor `batchSize: 1000`; `listNewsSearchIndexes()` returns definitions; new `dropNewsSearchIndex()`                                                                                                                                                                                                                                                                                                   |
| `setup`                | Runs every target, logs each failure, and fails with `SetupError` at the end if any target failed                                                                                                                                                                                                                                                                                                                                                                                   |
| `setup` search indexes | `reconcileSearchIndexes` **detects** an index whose definition changed. This goes beyond the planned code comment: comparison is a subset match per `type`+`path`, ignoring field order and extra server-side default keys. By default drift is logged and the target fails. `setup --recreate-search-indexes` drops the index and recreates it                                                                                                                                     |
| `backup`               | Backs up all targets **concurrently** (`Effect.forEach`, `concurrency: 'unbounded'`), one file per target in `<backupDir>/<label>/`; each target has its own 5-minute timeout and its own error handling, so one failure doesn't cancel the others; fails with `BackupError` only if every target failed; the scheduler catches `BackupError` and keeps running. `setup` and `restore` stay sequential: `setup` is fast, and `restore` parses the whole file into memory per target |
| Backup writer          | Streams the cursor, joined 1000 documents per write, into `<timestamp>.json.partial` and renames it when done. The partial file is removed on failure or timeout, so `restore` never picks up a truncated file. A timeout logs `Timed out after 5m.`                                                                                                                                                                                                                                |
| `restore`              | Targets the first selected target by default; `--all` targets every one; without a file argument it uses the newest backup in the target's own label folder                                                                                                                                                                                                                                                                                                                         |
| Logging                | Every log line goes through `redact()`; failures now set exit code 1 (before, the top-level handler logged errors and exited 0)                                                                                                                                                                                                                                                                                                                                                     |
| Devcontainer           | `orfarchiv-db` renamed to `orfarchiv-db-1` (volumes too); new `orfarchiv-db-2` on host port 27018                                                                                                                                                                                                                                                                                                                                                                                   |
| `db/.env`              | `ORFARCHIV_DB_URLS` lists `orfarchiv-db-1` and `orfarchiv-db-2` with the dev credentials, replacing the old `localhost` `ORFARCHIV_DB_URL`. Because `ORFARCHIV_DB_URLS` takes precedence, the devcontainer's `ORFARCHIV_DB_URL` no longer applies to `db`. From the host, set `ORFARCHIV_DB_URLS` to `localhost:27017` / `localhost:27018` instead                                                                                                                                  |

### Deviations

- **Backup layout changes even with a single target.** Backups now always go to
  `<backupDir>/<label>/`. With `ORFARCHIV_DB_URLS` unset, production backups move into a
  subfolder, e.g. `backup/<host>/`. File contents are unchanged. Existing flat backups are not
  found by `restore` without a file argument; pass their path explicitly.
- **Failures exit non-zero.** This applies to every subcommand, not just the new multi-target
  paths.
- **No in-place search index update.** atlas-local rejects `updateSearchIndex` for vector indexes:
  `"mappings" is required`, and adding `type` is an unknown field. Dropping and recreating right
  away works, but the index can't be queried until the rebuild finishes. So recreation is opt-in
  via `--recreate-search-indexes`, and [S4](04-db-sync-and-verify.md)'s `verify` should report the
  same drift.
- **A hard crash can leave a `.partial` file,** e.g. a V8 out-of-memory abort, because finalizers
  don't run. `restore` ignores these (it only picks `*.json`), but nothing cleans them up.

### Verified

Against `orfarchiv-db-1` (436,710 docs restored from the 2026-09-02 production backup) and
`orfarchiv-db-2` (empty):

- **`setup`:** creates the collection and indexes on both targets. The second run only logs "is up
  to date".
- **Search index drift:** tested on `orfarchiv-db-2` with a one-field index.
  - Without the flag: warning, error, exit 1, and the index is untouched.
  - With `--recreate-search-indexes --target orfarchiv-db-2`: the index is recreated and `READY`
    within 1 s (empty collection).
  - Run again: up to date, exit 0.
- **Output:** old and new `backup` output is byte-identical (`cmp`) on the full collection.
- **Memory:** peak memory of `backup` on the full collection:

  |                               | Peak RSS (no cap) | Time  | `--max-old-space-size=256` | `=64`           |
  | ----------------------------- | ----------------- | ----- | -------------------------- | --------------- |
  | Old (`toArray` + `stringify`) | 1391 MB           | 2.7 s | out of memory              | out of memory   |
  | New, streamed                 | 386 MB            | 2.9 s | ok                         | ok (153 MB RSS) |

  The first streamed version wrote once per document, which took 18 s. With the driver's default
  cursor batches it still needed more than 128 MB of heap. Batching the writes and setting
  `batchSize: 1000` fixed both.

- **Timeout:** tested with the timeout temporarily set to 500 ms. `orfarchiv-db-1` timed out and
  left no `.partial` file, `orfarchiv-db-2` was still backed up, and the run exited 0. With only
  `orfarchiv-db-1` it exited 1.
- **Unreachable target:** tested with a fake URL that includes credentials. The good target is
  backed up and no folder is created for the bad one. Setup exits 1; backup exits 0, or 1 if every
  target failed.
- **`restore`:**
  - The full backup restored into `orfarchiv-db-1` in 12 s without `--target`, so only the first
    target was touched.
  - A cross-target `restore <db-1 file> --target orfarchiv-db-2 --dry-run` works.
- **`--target`:** a single label backs up only that target; `nope` lists the available labels and
  exits 1.
- **`ORFARCHIV_DB_URLS_FILE`:** order kept, duplicates dropped; the fallback to `ORFARCHIV_DB_URL`
  works.
- **Credentials:** no connection credentials in any log or backup file.
- **Stopped container:** with `orfarchiv-db-2` stopped, `orfarchiv-db-1` was backed up in full and
  the failure for `orfarchiv-db-2` was logged; backup exited 0 and setup exited 1. A stopped target
  fails after about 30 s, the driver's default server selection timeout, which is well inside the
  5-minute limit per target.
- **Concurrent backup:** with `orfarchiv-db-2` stopped, all targets started together.
  `orfarchiv-db-1` finished in about 2.4 s without waiting for the stopped target, whose error came
  about 30 s later; exit 0. With `orfarchiv-db-1` plus two unreachable hosts, all three ran at once,
  both failures were logged, and the backup completed. With only unreachable hosts: exit 1. The
  output is still byte-identical.
