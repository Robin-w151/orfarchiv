# S4 — `db`: `sync` + `verify` subcommands

**Owner:** Me   **Repo:** `db`   **Size:** M
**Depends on:** [S3](03-db-multi-target.md)   **Blocks:** [S8](08-seed-and-parity.md)

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

| Check | Why |
| --- | --- |
| Document count | The blunt drift signal |
| Max `timestamp` | Detects a target that stopped receiving writes |
| Count of documents missing `titleEmbedding` | Detects a half-seeded or partially re-embedded target |
| Presence of each of the six expected indexes | A missing index means silently slow queries |
| Presence and queryable status of `news_title_vector` | A missing vector index means semantic search silently degrades |

Exit non-zero on divergence so it can be cron'd and alert.

Use `estimatedDocumentCount()` where an exact count is not required — an exact `countDocuments()` on
437k documents on M0 is slow enough to matter.

Note the known gap inherited from `setup`: `createSearchIndexes` only creates *missing* search
indexes by name and never updates a changed definition. So `verify` should check the index's
**definition** (dimensions, similarity, filter fields), not merely that the name exists.

## Acceptance criteria

- [ ] `sync --from A --to B` copies documents **with** `titleEmbedding` intact.
- [ ] `sync --dry-run` writes nothing and reports an accurate count.
- [ ] `sync --since <iso>` copies only documents at or after that timestamp.
- [ ] `sync` is idempotent — running it twice changes nothing the second time.
- [ ] `sync` streams; memory stays flat across a full 437k-document copy.
- [ ] `verify` reports counts, max timestamp, missing-embedding counts and index presence per target.
- [ ] `verify` checks the vector index **definition**, not just its name.
- [ ] `verify` exits non-zero when targets diverge, zero when they agree.
- [ ] Credentials appear in no log line.

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
