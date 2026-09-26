# S8 — Seed VPS + parity check

**Owner:** You   **Repo:** ops   **Size:** M
**Depends on:** [S4](04-db-sync-and-verify.md) **and** [S7](07-vps-mongodb-stack.md)   **Blocks:** [S9](09-benchmark-and-gate.md)
**Status:** ✅ Done (2026-09-26) — VPS seeded with 443,330 stories incl. embeddings, `db verify` agrees with M0

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

1. **`db setup --target <vps>`** — creates the `orfarchiv` database, the `news` collection, the eight
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
- Use the `orfarchiv_rw` user for `sync`'s target and the existing M0 rw user for its source (M0 has no
  read-only user).
- `sync` is idempotent, so an interrupted run can simply be re-run.
- Expect `_id` values to differ between the two databases. This is correct and safe — nothing reads
  `_id` (`mapToStory` ignores it, keyset pagination uses `timestamp` + `id`).

### Indexes before data

Running `setup` first means the indexes are built incrementally during the sync rather than as one
large build afterwards. The vector index is the exception — `mongot` builds it asynchronously
regardless.

## Acceptance criteria

- [x] The VPS holds the same document count as M0 (allowing for stories scraped during the sync).
- [x] **Zero** documents on the VPS are missing `titleEmbedding` where M0 has one.
- [x] All six regular indexes exist on the VPS.
- [x] `news_title_vector` exists, its definition matches (256 dims, cosine, the three filter fields),
      and it reports queryable.
- [x] A `$vectorSearch` query against the VPS returns sensible results.
- [x] `db verify` exits zero.
- [x] Disk usage after seeding is recorded, for [S12](12-monitoring-and-scheduled-verify.md) to set
      thresholds against.

## Results

- **Stories:** 443,329 on both M0 and the VPS (exact `countDocuments`). Neither side has test documents,
  stories without an `id`, or duplicate `id`s.
- **Embeddings:** 132 stories without `titleEmbedding` on both M0 and the VPS.
- **Indexes:** all six regular indexes plus `news_title_vector` (READY, queryable); `vector-check.js`
  4/4 passed. **Incomplete:** M0 also had `url_1` and `source_1`, which the model lacked and `verify`
  never compared. [S9](09-benchmark-and-gate.md) found them, added them to the model as `url_asc` /
  `source_asc` (eight regular indexes) and created them on the VPS.
- **`db verify` false divergence:** the first run reported one more story on the VPS. The cause was
  M0's `estimatedDocumentCount` (443,328), which lags its exact count (443,329); Atlas's collection
  metadata had drifted. `verify` now compares exact `countDocuments` counts instead
  (`orfarchiv-db@self-hosted-db`).
- **Final `db verify`** (2026-09-26T13:44Z, after a `--since` catch-up): both targets at 443,330
  stories, latest `2026-09-26T13:40:37Z`, 132 without embedding, indexes ok — "All 2 targets agree."
- **Disk footprint:** 766 MB for all three bind-mounted data directories combined (`/data/db`,
  `/data/configdb`, `/data/mongot`), measured with `du -hs`. This is the baseline for
  [S12](12-monitoring-and-scheduled-verify.md)'s thresholds.

## Verification

Run on the VPS inside `tmux`, in **one pane** (the variables below are not exported and must be read
again in any new pane). Passwords are read interactively so none end up in the shell history.
`read -rs "VAR?prompt"` is zsh syntax.

```bash
# From the laptop: the vector check script
scp .tasks/self-hosted-db/scripts/vector-check.js <vps>:~/vector-check.js

# On the VPS
tmux new -s s8

# 1. Build the CLI from the pushed branch (the released ghcr image has no sync/verify yet)
git clone --recursive -b self-hosted-db https://github.com/Robin-w151/orfarchiv-db.git ~/orfarchiv-db-s8
docker build -t orfarchiv-db-cli:s8 ~/orfarchiv-db-s8

# 2. Targets: M0 FIRST (verify's reference), then the VPS over the public TLS path
read -rs "ORFARCHIV_DB_M0_PW?M0 password: " && echo
read -rs "ORFARCHIV_DB_RW_PW?orfarchiv_rw password: " && echo
read -rs "ORFARCHIV_DB_RO_PW?orfarchiv_ro password: " && echo
ORFARCHIV_DB_M0_LABEL=<cluster>.mongodb.net
ORFARCHIV_DB_M0_URL="mongodb+srv://<m0-rw-user>:${ORFARCHIV_DB_M0_PW}@${ORFARCHIV_DB_M0_LABEL}/"
ORFARCHIV_DB_HOST=db1.orfarchiv.news
ORFARCHIV_DB_VPS_LABEL=${ORFARCHIV_DB_HOST}:27017
ORFARCHIV_DB_RW_URL="mongodb://orfarchiv_rw:${ORFARCHIV_DB_RW_PW}@${ORFARCHIV_DB_VPS_LABEL}/?tls=true&directConnection=true"
ORFARCHIV_DB_RO_URL="mongodb://orfarchiv_ro:${ORFARCHIV_DB_RO_PW}@${ORFARCHIV_DB_VPS_LABEL}/?tls=true&directConnection=true"
db() { docker run --rm -it --network host -e ORFARCHIV_DB_URLS="${ORFARCHIV_DB_M0_URL};${ORFARCHIV_DB_RW_URL}" orfarchiv-db-cli:s8 "$@"; }

# 3. Pre-flight: indexes + vector index exist from S7, VPS is empty
db verify --target "$ORFARCHIV_DB_VPS_LABEL"                                          # "Target is healthy."
db sync --from "$ORFARCHIV_DB_M0_LABEL" --to "$ORFARCHIV_DB_VPS_LABEL" --dry-run      # ~436,7xx stories

# 4. Bulk copy. Interrupted or throttled: just re-run, or chunk with --since
ORFARCHIV_DB_SYNC_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
time db sync --from "$ORFARCHIV_DB_M0_LABEL" --to "$ORFARCHIV_DB_VPS_LABEL"

# 5. Wait until mongot has caught up (READY, queryable), then check that vectors work
watch -n 30 "npx mongosh '$ORFARCHIV_DB_RO_URL' --quiet --eval 'printjson(db.getSiblingDB(\"orfarchiv\").news.getSearchIndexes().map(i => [i.name, i.status, i.queryable]))'"
npx mongosh "$ORFARCHIV_DB_RO_URL" --quiet --file ~/vector-check.js                   # 4/4 passed

# 6. Catch up stories scraped during the copy, then verify right away (ideally just after a scrape run)
db sync --from "$ORFARCHIV_DB_M0_LABEL" --to "$ORFARCHIV_DB_VPS_LABEL" --since "$ORFARCHIV_DB_SYNC_START"
db verify                                                                             # "All 2 targets agree.", exit 0

# 7. Embeddings survived: the VPS number must not exceed the M0 number
npx mongosh "$ORFARCHIV_DB_RO_URL" --quiet --eval 'db.getSiblingDB("orfarchiv").news.countDocuments({ titleEmbedding: { $exists: false } })'
npx mongosh "$ORFARCHIV_DB_M0_URL" --quiet --eval 'db.getSiblingDB("orfarchiv").news.countDocuments({ titleEmbedding: { $exists: false } })'

# 8. Footprint, for S12 thresholds
npx mongosh "$ORFARCHIV_DB_RO_URL" --quiet --eval 'printjson(db.getSiblingDB("orfarchiv").stats(1024 * 1024))'
df -h /
docker system df -v | grep -iE 'VOLUME NAME|orfarchiv'

# 9. Cleanup
docker rmi orfarchiv-db-cli:s8 && rm -rf ~/orfarchiv-db-s8 ~/vector-check.js
```

Notes:

- All runbook variables carry the `ORFARCHIV_DB_` prefix but none reuse the CLI's own names
  (`ORFARCHIV_DB_URL`, `ORFARCHIV_DB_URLS`, `ORFARCHIV_BACKUP_DIR`). Only `ORFARCHIV_DB_URLS` is passed
  into the container.
- Target labels are the URL authority, so `--from` / `--to` take `<cluster>.mongodb.net` and
  `db1.orfarchiv.news:27017`. Both URLs must be in `ORFARCHIV_DB_URLS`.
- `verify` treats the first target as the reference and requires the exact same count, latest
  `timestamp` and missing-embedding count, so any scrape landing on M0 between step 6's sync and
  `verify` fails it. Re-run step 6 in that case.
- The M0 source uses the existing M0 rw user: M0 has no read-only user, and admin is more privilege than
  `sync`/`verify` need (both only read from M0). The VPS target uses `orfarchiv_rw`.
- A full copy moves roughly 437k × ~3 KB ≈ 1.3 GB out of M0. Use `--since` for catch-ups instead of
  repeating the full copy.
- Steps 5, 7 and 8 assume Node on the VPS for `npx mongosh`. Without it, use
  `docker exec -i orfarchiv-db mongosh ...` against the container instead.
- `vector-check.js` checks the index definition (256 dims, cosine, the three filter fields) and
  queryability, then runs `$vectorSearch` with a random story's own embedding, with and without a
  `source` + `timestamp` filter, and expects that story among the hits with score ≥ 0.99. It exits
  non-zero otherwise, so an index that silently returns nothing is caught.

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
