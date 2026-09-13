# S8 — Seed VPS + parity check

**Owner:** You   **Repo:** ops   **Size:** M
**Depends on:** [S4](04-db-sync-and-verify.md) **and** [S7](07-vps-mongodb-stack.md)   **Blocks:** [S9](09-benchmark-and-gate.md)

## Goal

Copy all 436,710 documents — **with embeddings** — from M0 into the VPS database, and prove the two
agree.

## Why

This is where the code track and the infra track converge. Until the VPS holds a complete, correct
copy of the data, it cannot be benchmarked ([S9](09-benchmark-and-gate.md)) or serve reads.

## Scope

**In scope**

- `db setup` against the VPS to create indexes and the vector index.
- `db sync` M0 → VPS.
- `db verify` to confirm parity.
- Waiting for the `mongot` vector index to become queryable.

**Out of scope**

- Sending any production traffic to the VPS.

## Technical notes

### Order of operations

1. **`db setup --target <vps>`** — creates the `orfarchiv` database, the `news` collection, the six
   regular indexes, and the `news_title_vector` vectorSearch index.
2. **`db sync --from <m0> --to <vps>`** — the bulk copy.
3. **Wait for the vector index.** Search index builds are asynchronous. `listSearchIndexes()` reports
   a status; wait for queryable rather than assuming readiness. For 437k vectors this takes a while.
4. **`db verify`** — parity.

### Why `sync` and not `restore`

`db restore` deliberately drops `titleEmbedding` (it copies only the six `STORY_FIELDS`). Seeding
from a backup file would leave all 437k documents without embeddings, requiring a full re-embed
through the embedding server. `db sync` copies embeddings directly between live databases. This is
the entire reason S4 exists and why it is on the critical path.

### Practicalities

- Run inside `tmux` or `screen` **on the VPS**, not over a laptop SSH session. A full sync of 437k
  documents from M0 across the internet takes a while and this is the first real exercise of the TLS
  path.
- Use the `app-write` user for `sync`'s target and `app-read` for its source.
- `sync` is idempotent, so an interrupted run can simply be re-run.
- Expect `_id` values to differ between the two databases. This is correct and safe — nothing reads
  `_id` (`mapToStory` ignores it, keyset pagination uses `timestamp` + `id`).

### Indexes before data

Running `setup` first means the indexes are built incrementally during the sync rather than as one
large build afterwards. The vector index is the exception — `mongot` builds it asynchronously
regardless.

## Acceptance criteria

- [ ] The VPS holds the same document count as M0 (allowing for stories scraped during the sync).
- [ ] **Zero** documents on the VPS are missing `titleEmbedding` where M0 has one.
- [ ] All six regular indexes exist on the VPS.
- [ ] `news_title_vector` exists, its definition matches (256 dims, cosine, the three filter fields),
      and it reports queryable.
- [ ] A `$vectorSearch` query against the VPS returns sensible results.
- [ ] `db verify` exits zero.
- [ ] Disk usage after seeding is recorded, for [S12](12-monitoring-and-scheduled-verify.md) to set
      thresholds against.

## Verification

```bash
# On the VPS, inside tmux
db setup --target <vps>
db sync --from <m0> --to <vps>
db verify

# Embeddings survived
mongosh "<vps>" --eval 'db.news.countDocuments({ titleEmbedding: { $exists: false } })'
mongosh "<m0>"  --eval 'db.news.countDocuments({ titleEmbedding: { $exists: false } })'
# the VPS number must not exceed the M0 number

# Vector index ready and working
mongosh "<vps>" --eval 'db.news.getSearchIndexes()'
mongosh "<vps>" --eval 'db.news.aggregate([{ $vectorSearch: { index: "news_title_vector",
  path: "titleEmbedding", queryVector: [...], numCandidates: 100, limit: 5 } }])'

# Footprint, for S12 thresholds
mongosh "<vps>" --eval 'db.stats()'
df -h
```

## Risks / open questions

- Stories scraped **during** the sync land on M0 but not the VPS. Harmless: re-run `db sync` at the
  end to catch up, or let [S10](10-enable-dual-writes.md)'s dual writes and a later `sync` converge
  it. Do not expect exact count equality on a live system — `verify` should be read with that in
  mind.
- If the vector index build is slow or fails, `$vectorSearch` returns empty **without erroring**,
  which looks like a data problem rather than an index problem. Always check
  `getSearchIndexes()` before concluding the data is wrong.
- M0 is throttled; a full read of 437k documents may be slow or may hit rate limits. If so, use
  `--since` to sync in chunks by timestamp window.
