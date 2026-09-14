# S3 — `db`: multi-target config, `setup` / `backup` / `restore`

**Owner:** Me   **Repo:** `db`   **Size:** M
**Depends on:** [S2](02-shared-module.md)   **Blocks:** [S4](04-db-sync-and-verify.md)

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
carries over. Parsing comes from `shared/common/targets.ts` ([S2](02-shared-module.md)).

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

Note the existing `createSearchIndexes` only creates *missing* indexes by name — it never updates a
changed definition, so a dimension change would silently no-op. Out of scope to fix, but worth a
comment in the code so S8 does not get surprised.

### `backup`

- One file per target: `<backupDir>/<label>/<timestamp>.json`.
- Per-target failure logs an error and **continues**; the run fails only if *every* target failed.
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

- [ ] `ORFARCHIV_DB_URLS` parsed, ordered, with `_FILE` support; falls back to `ORFARCHIV_DB_URL`.
- [ ] With `ORFARCHIV_DB_URLS` unset, behaviour is **byte-identical** to S1.
- [ ] `--target <label>` filters every subcommand to one database.
- [ ] `setup` reconciles indexes on all targets; running it twice is a no-op.
- [x] `setup` now respects `.env` / `.env.local`. *(Done in [S1](01-db-cli-and-build.md).)*
- [ ] `backup` writes one file per target under its own label directory.
- [ ] One unreachable target does not prevent the others being backed up; the run fails only if all fail.
- [ ] Streamed backup output parses back through `restore` unchanged.
- [ ] `restore` without `--target` touches only the first target.
- [ ] Connection credentials appear in **no** log line or filename.

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
