# S9 — Benchmark + go/no-go

**Owner:** Both (I write the script, you run and judge)   **Repo:** ops   **Size:** M
**Depends on:** [S8](08-seed-and-parity.md)   **Blocks:** [S10](10-enable-dual-writes.md)

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

- [ ] Benchmark script exists and runs against an arbitrary target by URL.
- [ ] Results captured for both targets, warm and cold, p50 and p95, for all four query types.
- [ ] M0's region recorded alongside the results.
- [ ] A written go/no-go decision with the numbers behind it, recorded in this file.
- [ ] If no-go: the chosen fallback from the list above is recorded.

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
