# S4 — `db`: `sync` + `verify` subcommands

**Owner:** Me **Repo:** `db` **Size:** M
**Depends on:** [S3](03-db-multi-target.md) **Blocks:** [S8](08-seed-and-parity.md)
**Status:** ✅ Done (2026-09-24) — verified against two live atlas-local instances, see [Result](#result-2026-09-24)

## Goal

Add two subcommands: `sync` copies one database's contents into another **including embeddings**, and
`verify` reports whether the configured targets actually agree.

## Why

**This is the critical path.** [S8](08-seed-and-parity.md) cannot seed the VPS without `sync`.

The existing `restore` deliberately drops `titleEmbedding` — it copies only the six `STORY_FIELDS`.
Seeding the VPS from a backup would therefore leave all 436,710 documents without embeddings, and
regenerating them means re-embedding every title through the embedding server. `sync` exists to move
data between live databases with embeddings intact.

`verify` is the answer to "how do I know M0 is still up to date?". Once N independent databases are
written in parallel, drift is possible whenever one is briefly unreachable, and there is currently no
way to detect it.

## Scope

**In scope**

- `db sync --from <label> --to <label> [--since <iso>] [--dry-run]`
- `db verify [--target <label>]`

**Out of scope**

- Automatic repair. `verify` reports; a human decides whether to `sync`.
- Scheduling. [S12](12-monitoring-and-scheduled-verify.md) puts `verify` on a cron.

## Technical notes

### `sync`

Streams the source collection into the target with batched `bulkWrite` upserts keyed on `id`:

```ts
{ updateOne: { filter: { id }, update: { $set: { ...storyFields, titleEmbedding } }, upsert: true } }
```

- **Copies `titleEmbedding`** — the whole point, and the one difference from `restore`.
- `--since <iso>` filters on `timestamp` for incremental catch-up after a target has been down.
- `--dry-run` reports what would be written without writing.
- Batch with `{ ordered: false }`, matching `restore`'s existing approach.
- Stream the source cursor rather than `toArray()` — same reasoning as the backup writer in S3.
- Reuse `STORY_FIELDS` from `restore` so the two stay consistent about which fields are authoritative.

**`_id` divergence is expected and safe.** `sync` upserts on `id`, so documents created independently
on two targets will have different `_id`s. Nothing reads `_id`: the UI's `mapToStory` ignores it and
keyset pagination uses `timestamp` + `id`. Do not attempt to preserve `_id`; it would only create
conflicts.

### `verify`

Per target, report:

| Check                                                | Why                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| Document count                                       | The blunt drift signal                                         |
| Max `timestamp`                                      | Detects a target that stopped receiving writes                 |
| Count of documents missing `titleEmbedding`          | Detects a half-seeded or partially re-embedded target          |
| Presence of each of the eight expected indexes       | A missing index means silently slow queries                    |
| Presence and queryable status of `news_title_vector` | A missing vector index means semantic search silently degrades |

Exit non-zero on divergence so it can be cron'd and alert.

Use `estimatedDocumentCount()` where an exact count is not required — an exact `countDocuments()` on
437k documents on M0 is slow enough to matter.

Note the known gap inherited from `setup`: `createSearchIndexes` only creates _missing_ search
indexes by name and never updates a changed definition. So `verify` should check the index's
**definition** (dimensions, similarity, filter fields), not merely that the name exists.

## Acceptance criteria

- [x] `sync --from A --to B` copies documents **with** `titleEmbedding` intact.
- [x] `sync --dry-run` writes nothing and reports an accurate count.
- [x] `sync --since <iso>` copies only documents at or after that timestamp.
- [x] `sync` is idempotent — running it twice changes nothing the second time.
- [x] `sync` streams; memory stays flat across a full 437k-document copy.
- [x] `verify` reports counts, max timestamp, missing-embedding counts and index presence per target.
- [x] `verify` checks the vector index **definition**, not just its name.
- [x] `verify` exits non-zero when targets diverge, zero when they agree.
- [x] Credentials appear in no log line.

## Verification

With two atlas-local instances in the devcontainer:

```bash
cd db && npm run build

# Seed A only, then sync into empty B
node dist/db.js sync --from <A> --to <B> --dry-run
node dist/db.js sync --from <A> --to <B>
node dist/db.js verify                        # expect parity, exit 0

# Embeddings must have survived
mongosh "<B>" --eval 'db.news.countDocuments({ titleEmbedding: { $exists: false } })'   # 0

# Idempotency
node dist/db.js sync --from <A> --to <B> && node dist/db.js verify   # still 0

# Drift detection
mongosh "<B>" --eval 'db.news.deleteOne({})'
node dist/db.js verify                        # non-zero exit, names the diverging target

# Incremental repair
node dist/db.js sync --from <A> --to <B> --since 2026-01-01T00:00:00Z
node dist/db.js verify                        # back to 0
```

## Risks / open questions

- A full `sync` of 437k documents across the internet (M0 → VPS) will take a while and is the first
  real test of the TLS path. S8 should run it inside `tmux`/`screen` on the VPS rather than over a
  laptop SSH session.
- `--since` relies on `timestamp`, which is the story's publication time, not a write time. A story
  back-filled with an old timestamp would be missed by an incremental sync. For a target that was
  down, prefer a full `sync` (idempotent) over `--since` unless the window is well understood.

## Result (2026-09-24)

Implemented in `db` on branch `self-hosted-db`. `npm run lint` and `npm run build` pass.

### What changed

| Area       | Change                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync`     | `db sync --from <label> --to <label> [--since <iso>] [--dry-run] [--batch-size n]`. It streams the source cursor, grouped into `bulkWrite` upserts on `id` (`ordered: false`) that `$set` `STORY_FIELDS` plus `titleEmbedding`, and ends with an `inserted / updated / unchanged / skipped` summary                     |
| `verify`   | `db verify [--target <label>]` checks all targets concurrently: `estimatedDocumentCount`, latest `timestamp`, count without `titleEmbedding`, the eight indexes (name and key), and `news_title_vector` (definition, `READY` and `queryable`). Any problem exits 1 with `VerifyError`, naming each failing target and why |
| Model      | `indexes`, `searchIndexes` and `searchIndexDefinitionMatches` moved from `services/setup.ts` to `shared/model.ts`, so `setup` and `verify` share one definition. The new `indexMatches` compares name and key with `Equal.equals` on the key entries, so field order counts for compound indexes                        |
| `targets`  | `db targets [--target <label>]` lists the configured target labels, never the URLs, numbered by their position in `ORFARCHIV_DB_URLS`. The number stays the real position when filtered with `--target`                                                                                                                 |
| Errors     | `formatError(error, { withStack })` gets an optional stack; the top-level handler in `src/index.ts` sets it only for errors that aren't the app's own (`isAppError`)                                                                                                                                                    |
| `Database` | Adds `streamNews({ since })` (keeps embeddings), `countNews`, `estimatedNewsCount`, `countNewsWithoutEmbedding`, `latestNewsTimestamp` and `listNewsIndexes`. `upsertNews` takes the field list and returns the write counts. `listNewsSearchIndexes` also returns `status` and `queryable`                             |

### How `sync` handles changes

The comparison happens on the server. Every source story is sent as an upsert:

- a story missing from the destination is inserted with a new `_id`
- a story that differs is overwritten with the source's values
- a story that is identical is a no-op that MongoDB doesn't write, counted as `unchanged`

Fields missing in the source are never unset, and stories that exist only on the destination are
never deleted. The source always wins.

### Deviations

- **Divergence is measured against the first target.** `verify` compares every other target
  against the first one in `ORFARCHIV_DB_URLS`.
- **The missing-embedding count is compared, not required to be 0.** The scraper skips titles it
  can't embed.
- **`verify --target <label>` only runs the health checks.** It has no other target to compare
  against.
- **`sync` rejects the shared `--target` flag, and `--from` equal to `--to`.**
- **Expected errors no longer print a stack trace.** The top-level handler in `src/index.ts` logs
  the app's own errors (`DatabaseError`, `VerifyError`, …) with only the message and cause, which
  keeps a cron'd `verify` log readable. Anything else still prints the full stack. This applies to
  every subcommand. A new error class has to be added to `APP_ERROR_TAGS` in `shared/error.ts`,
  or it keeps printing a stack.
- **New `db targets` command,** not in the original scope. It shows which label `--target`,
  `--from` and `--to` expect, and which target is first, the one `verify` compares against and
  `restore` writes to.
- **`sync` has no timeout.**
- **`sync` warns but continues when the destination has no `news_title_vector`.**
- **`countNewsWithoutEmbedding` scans the whole collection** because there's no index on
  `titleEmbedding`. Locally that takes under a second; on M0 it will be slower.
- **The latest-timestamp check can fail while the scraper is writing.** A write that lands between
  the per-target reads causes a false alarm. A cron'd `verify` ([S12](12-monitoring-and-scheduled-verify.md))
  should retry once before alerting.

### Verified

Against `orfarchiv-db-1` (A) and `orfarchiv-db-2` (B), 436,710 docs each. First, 5,000 real
embeddings were backfilled into A with `scraper --backfill-embeddings --max-docs 5000`:

- **Before `sync`:** `verify` exits 1 and names B: `436710 without embedding vs 431710`.
- **`--dry-run`:** reports 436,710 stories and writes nothing.
- **Full `sync`:** copied 436,710 stories in 9 s with `--max-old-space-size=128` (peak RSS 267 MB):
  - 5,000 updated, 431,710 unchanged
  - all 5,000 embedded docs on B are byte-identical to A, apart from `_id`
  - `verify` then exits 0
- **Idempotency:** a second `sync` reports 0 inserted, 0 updated and 436,710 unchanged; `verify`
  still exits 0.
- **Drift:** after deleting B's newest story, `verify` exits 1 and names B with both the count
  mismatch and the older latest timestamp.
- **Repair with `--since`:** `sync --since <that timestamp>` reads exactly 1 story and inserts it;
  `verify` exits 0. `--since 2026-08-25T00:00:00Z` reads 2,214 stories, all unchanged.
- **Search index drift:** a 128-dimension `news_title_vector` on B is reported as "definition
  changed" and "not queryable (status BUILDING)".
  - After `setup --recreate-search-indexes`, B is reported as `BUILDING` for about 4 s, then
    `verify` exits 0.
- **Errors:**
  - an unreachable third target is reported as `unreachable` with exit 1
  - an unknown label lists the available labels
  - an invalid `--since` shows the CLI error
  - `--from` equal to `--to` and `--target` on `sync` both exit 1
- **Credentials:** none of the 1,065 captured log lines contains credentials, including those of
  the unreachable target's URL.
- **Regression:** the output of `backup` is byte-identical (`cmp`) to the S3 backup, and `setup` is
  still a no-op.
- **`targets`:** lists every configured target in order. `--target orfarchiv-db-2` prints only that
  target, still with its real position, and an unknown label exits 1.
