# S9 — Benchmark + go/no-go

**Owner:** Both (I write the script, you run and judge)   **Repo:** ops   **Size:** M
**Depends on:** [S8](08-seed-and-parity.md)   **Blocks:** [S10](10-enable-dual-writes.md)
**Status:** ✅ Done (2026-09-26) — **Go**: the VPS wins every cold query and warm keyword search, see [Results](#results)

## Goal

Measure real query latency from a Vercel function against both databases, and decide whether the
self-hosted target meets the "at least as fast as M0" requirement.

## Why

This is the **gate**. It is the one requirement that cannot be satisfied by construction, only by
measurement. Everything before it is reversible and production-neutral; read traffic moves only
after it passes.

## Scope

**In scope**

- A benchmark script comparing targets on the queries the app actually runs.
- Running it from a `fra1` Vercel preview deployment, warm and cold.
- A recorded decision.

**Out of scope**

- Changing production configuration. That is [S10](10-enable-dual-writes.md) and
  [S11](11-point-ui-reads-at-vps.md).

## Technical notes

### What to measure

The queries the UI actually issues, not synthetic ones:

| Query | Source |
| --- | --- |
| Keyword search with regex `$or` over `title`/`category`/`source`, keyset paginated | `search/keyword.ts` |
| `$vectorSearch` against `news_title_vector`, plus the `$addFields`/`$sort` recency-weighting pipeline | `search/semantic.ts` |
| `distinct('category')` and `distinct('source')` | `search/semantic.ts` vocabulary |
| `findOne({ url })` | `search/news.ts` |

Report **p50 and p95**, not just means — tail latency is what users feel, and it is where a throttled
shared tenant differs most from a dedicated box.

### Where to run it from

**From a Vercel preview deployment in `fra1`** — not from the VPS, and not from a laptop. The number
that matters is the Vercel→database path, which is the only one production uses. Running it on the
VPS measures the wrong thing and will flatter the self-hosted target.

Also confirm **M0's actual region** so the comparison is like-for-like. If M0 is in AWS
`eu-central-1`, its traffic stays inside AWS while the VPS is a different AS over the public
internet.

### Warm and cold

Measure both:

- **Warm**: a reused container with an open pooled connection. One query ≈ one round trip.
- **Cold**: a fresh container paying TCP + TLS + SCRAM before its first query. This is where a
  same-metro difference of a few milliseconds multiplies, and where `ssl_session_cache`
  ([S7](07-vps-mongodb-stack.md)) earns its place.

### Expectation

The VPS is in Frankfurt, the same metro as `fra1`, so geography is largely a non-issue. The working
set fits entirely in 8 GB RAM against a throttled shared tenant, and that gap should dwarf any
same-metro network delta. **This is expected to pass** — it is a confirmation step, not a coin flip.
But it is measured because the cold-start path is genuinely hard to predict.

### If it does not pass

Do not abandon the work. Options, roughly in order:

1. Check `maxPoolSize` and connection reuse — a cold start opening several connections instead of one
   is the most likely culprit.
2. Confirm TLS session resumption is actually working.
3. Leave the VPS as a **write** target only, keeping M0 as the UI's primary. The epic still delivers
   multi-write, multi-backup and failover; only the primary-read cutover waits.

## Acceptance criteria

- [x] Benchmark script exists and runs against an arbitrary target by URL.
- [x] Results captured for both targets, warm and cold, p50 and p95, for all four query types.
- [x] M0's region recorded alongside the results.
- [x] A written go/no-go decision with the numbers behind it, recorded in this file.
- [x] If no-go: the chosen fallback from the list above is recorded. — n/a, go

## Results

### Setup

- **Route:** `ui/src/routes/api/bench/+server.ts` on the throwaway `ui` branch `bench/s9`, deployed as a
  Vercel preview. Function region comes from the Vercel project settings; every response reports
  `VERCEL_REGION` and every sample came from **`fra1`**. Targets come from the preview-scoped env vars
  `BENCH_DB_URL_M0` / `BENCH_DB_URL_VPS`, guarded by `BENCH_TOKEN`.
- **Driver:** [`scripts/bench-run.mjs`](scripts/bench-run.mjs), 5 rounds per run, alternating targets.
  Warm: one reused client, 30 samples per query per call. Cold: a fresh `MongoClient` per sample,
  timing `connect()` (DNS, TCP, TLS, SCRAM, topology) plus the first query.
- **Queries:** the app's own shapes and config constants. Query vectors and URLs are the stored
  `titleEmbedding`s and URLs of 10 fixed stories, so the embedding server is not involved. `distinct`
  bypasses the app's 1 h vocabulary cache.
- **Targets:** M0 on **AWS Frankfurt (`eu-central-1`)**; VPS at `db1.orfarchiv.news:27017`.

### Missing indexes (found and fixed)

The first two runs (15:33 and 15:36 UTC) showed the VPS at 165 ms for `findOne(url)` and 273 ms for
`distinct` against 1.5 ms and 2 ms on M0 — collection scans. M0 had two indexes the model never knew
about, `url_1` and `source_1`, and `db verify` only checked the model's list, so
[S8](08-seed-and-parity.md) passed without them. Both were added to `db/src/shared/model.ts` as
`url_asc` / `source_asc`, created on the VPS with `db setup`, and renamed on M0 by hand (drop +
recreate) so both targets match the model. The two pre-fix runs are excluded below.

### Numbers

Four runs after the fix, 2026-09-26 at 15:53, 15:55, 17:03 and 18:46 UTC, pooled. The runs agree within
a few percent of each other.

| Query | Target | p50 warm | p95 warm | p50 cold | p95 cold | n warm / cold |
| --- | --- | --- | --- | --- | --- | --- |
| keyword search | VPS | **63.3 ms** | **324.7 ms** | **102.3 ms** | **379.0 ms** | 600 / 100 |
| keyword search | M0 | 76.2 ms | 392.5 ms | 170.4 ms | 491.7 ms | 600 / 100 |
| `$vectorSearch` | VPS | 61.5 ms | 81.1 ms | **100.7 ms** | **129.7 ms** | 600 / 100 |
| `$vectorSearch` | M0 | **56.5 ms** | **64.6 ms** | 150.3 ms | 164.8 ms | 600 / 100 |
| `distinct` ×2 | VPS | 4.1 ms | 5.0 ms | **53.3 ms** | **58.9 ms** | 600 / 100 |
| `distinct` ×2 | M0 | **2.3 ms** | **3.1 ms** | 139.7 ms | 153.0 ms | 600 / 100 |
| `findOne(url)` | VPS | 3.4 ms | 3.9 ms | **36.2 ms** | **40.0 ms** | 600 / 100 |
| `findOne(url)` | M0 | **1.9 ms** | **2.2 ms** | 95.0 ms | 106.3 ms | 600 / 100 |
| connect only | VPS | – | – | **32.4 ms** | **36.3 ms** | 0 / 400 |
| connect only | M0 | – | – | 92.8 ms | 104.5 ms | 0 / 400 |

Cold values include `connect()`. Both targets opened the same number of connections per cold sample
(1, or 2 for the parallel `distinct` pair), so connection reuse is not a factor.

The two pre-fix runs measured VPS `connect()` at 85 ms. Nothing changed on the VPS between runs, and it
held at 30–32 ms in all four later runs, so that was a transient condition around 15:30 UTC.

### Decision: Go

- **Cold:** the VPS is faster on every query by 50–70 ms at p50, driven by a 32 ms connect against
  93 ms. Every new Vercel instance pays this.
- **Warm keyword search** — the main search path — is faster on the VPS at both p50 and p95.
- **Warm `findOne` / `distinct`** are ~1.5–2 ms slower on the VPS: network distance (public internet vs
  inside AWS), as expected. Not user-visible, and the vocabulary is cached for an hour.
- **Warm `$vectorSearch`** is 5 ms slower at p50 and 16 ms at p95, the only gap that comes from the
  database itself. It is small next to the embedding-server call every semantic search also makes.

Strictly read, "at least as fast as M0" fails on three warm rows, by 2–16 ms. Against 50–70 ms saved on
every cold query and a faster keyword search, that is accepted. [S10](10-enable-dual-writes.md) and
[S11](11-point-ui-reads-at-vps.md) may proceed. No fallback needed.

## Verification

The script itself is verified by running it twice against the same target and getting consistent
numbers. The decision is verified by review.

Record results in a table like:

| Query | Target | p50 warm | p95 warm | p50 cold | p95 cold |
| --- | --- | --- | --- | --- | --- |
| keyword search | VPS | | | | |
| keyword search | M0 | | | | |
| `$vectorSearch` | VPS | | | | |
| `$vectorSearch` | M0 | | | | |
| `distinct` ×2 | VPS | | | | |
| `distinct` ×2 | M0 | | | | |
| `findOne(url)` | VPS | | | | |
| `findOne(url)` | M0 | | | | |

## Risks / open questions

- M0's throttling is variable; a single benchmark run may catch it at an unrepresentative moment. Run
  at a few different times of day before concluding.
- Vercel preview deployments may not land in the same region as production. Confirm the function
  region explicitly rather than assuming `fra1`.
