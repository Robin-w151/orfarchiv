# S5 — `scraper`: multi-target writes

**Owner:** Me   **Repo:** `scraper`   **Size:** M
**Depends on:** [S2](02-shared-module.md)   **Blocks:** [S10](10-enable-dual-writes.md)

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

- [ ] With `ORFARCHIV_DB_URLS` unset, behaviour is identical to today.
- [ ] With two targets, one scrape writes the same stories to both.
- [ ] Embeddings are computed **once** per scrape regardless of target count (assert on the number of
      embedding-server calls, not just the result).
- [ ] Two targets in different states each receive the correct insert/update set.
- [ ] One unreachable target: the other still receives writes, the run exits successfully, an error is
      logged naming the failed target.
- [ ] All targets unreachable: the run fails and the cause surfaces through `logCause`.
- [ ] `--target <label>` restricts writes to one database.
- [ ] `backfillEmbeddings` embeds a title shared by two targets only once.
- [ ] Credentials appear in no log line.
- [ ] `npm run lint` and `npm run test` pass.

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
