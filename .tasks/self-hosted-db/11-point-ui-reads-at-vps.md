# S11 — Point UI reads at the VPS

**Owner:** You   **Repo:** ops   **Size:** S
**Depends on:** [S10](10-enable-dual-writes.md) **and** [S6](06-ui-database-service.md)   **Blocks:** [S12](12-monitoring-and-scheduled-verify.md)
**Status:** ✅ Done (2026-09-30) — `develop` reads from the VPS with M0 as fallback, production still on M0, see [Results](#results)

## Goal

Configure the Vercel deployment with the VPS as priority 1 and M0 as priority 2, so user-facing reads
are served by the self-hosted database with automatic failover.

## Why

This is the payoff: the epic's actual goal. By this point the VPS has held a complete copy of the
data for days ([S8](08-seed-and-parity.md), [S10](10-enable-dual-writes.md)), has been benchmarked
([S9](09-benchmark-and-gate.md)), and the UI knows how to fail over ([S6](06-ui-database-service.md)).

It is also the most visible change, which is why it comes last among the cutover steps and why the
rollback is trivial.

## Scope

**In scope**

- Set `ORFARCHIV_DB_URLS` in Vercel project settings, redeploy, monitor.

**Out of scope**

- Turning M0 off. It stays as the fallback target — retiring it is
  [S13](13-optional-second-target.md), and only after a second self-hosted target exists.
- Production. S11 switches `develop` only. Releasing `develop` → `main` and setting the variable for
  Production happens later, after a couple of weeks of stable operation on `develop`.

## Technical notes

### Configuration

In Vercel project settings, one line, with the URLs separated by `;`:

```
ORFARCHIV_DB_URLS=mongodb://orfarchiv_ro:<pw>@db1.orfarchiv.news:27017/?tls=true&directConnection=true;mongodb+srv://<m0-user>:<pw>@<cluster>.mongodb.net/
```

- **`directConnection=true` is required.** Without it the driver tries to discover the replica-set
  member behind nginx and fails ([S7](07-vps-mongodb-stack.md)).
- **`;` rather than a newline.** `parseTargets` accepts both, and one line avoids newline problems in the
  Vercel text field.
- **Use the read-only user** for the UI. It needs no write privileges, and `$vectorSearch` only needs read.
- Mark the variable **Sensitive**.

`ORFARCHIV_DB_URL` stays set as the rollback path.

### Preview first, then `develop`

The S6 code (`DatabaseService`, `ORFARCHIV_DB_URLS`) exists only on `ui`'s `self-hosted-db` branch.
`develop` is the default branch, deployed as a Vercel Preview at `develop.orfarchiv.news`, and `main`
is only the released branch.

1. **Preview of `self-hosted-db` on M0.** Only `ORFARCHIV_DB_URL` applies, so this deployment reads from M0
   alone. It shows whether Vercel checks out the new `src/lib/shared/common` submodule, and it gives an
   M0 latency baseline on the new code.
2. **Preview of `self-hosted-db` on the VPS.** Set `ORFARCHIV_DB_URLS` for Preview, scoped to branch
   `self-hosted-db`, and redeploy. Now only the database differs from step 1. The failover test also runs
   here, where nobody else is affected.
3. **`develop`.** Set the same variable scoped to branch `develop`, then merge. The merge deploys directly
   against the VPS, and only the quick checks are repeated.

Production stays on M0 throughout S11.

### Proving the VPS serves the reads

The function logs only show which targets are *configured*: `Using database targets: …`, logged once
per cold start. To confirm that reads actually go to the VPS, look at the VPS itself. The UI's client
sets `appName: 'orfarchiv-ui'`, so a `$currentOp` over idle connections, run as root over the loopback
port, counts the UI's connections.

### CDN caching hides the backend

`news.search` and `news.checkUpdates` send `s-maxage=300`, and `news.content` a longer `s-maxage`.
Repeated identical requests are answered by Vercel's CDN without touching the database. That skews
latency numbers and can hide a failed failover. Every test request below therefore carries a unique
`_=<nonce>` query parameter, which tRPC ignores but the cache key includes, and prints `x-vercel-cache`
(expect `MISS`).

### Rollback

Remove `ORFARCHIV_DB_URLS` (or reorder it to put M0 first) and redeploy. That is the whole rollback —
seconds, no data implications, since both databases are complete and current.

### What to watch after deploy

| Signal | Meaning |
| --- | --- |
| Search latency, p50 and p95 | Should match or beat the S9 measurements |
| Semantic search returning results | Confirms `mongot` is serving `$vectorSearch` on the VPS under real load |
| Failover log lines | Should be **absent**. Any appearance means the VPS is flapping |
| tRPC 503s | Should be zero. Non-zero means both targets failed |
| Vercel function duration | Cold starts in particular — compare against S9's cold numbers |

Semantic search deserves specific attention, because it can fail silently in two ways:

- **Unhealthy vector index.** `$vectorSearch` returns **empty results without erroring**, which the UI
  cannot distinguish from "no matches". Failover does not trigger, because nothing failed.
- **Embedding error.** On an `EmbeddingError`, `search/news.ts` falls back to **keyword search** and
  logs `Semantic search unavailable, falling back to keyword search`. Results appear, but they are not
  semantic.

So check semantic search explicitly: results must be non-empty **and** the fallback log line absent. The
pre-flight also runs [`vector-check.js`](scripts/vector-check.js) against the VPS as `orfarchiv_ro`.

Semantic search is rate-limited to 60 query embeddings per client per minute. Keep scripted samples
below that, or the fallback above skews the numbers.

### Failover timing (from S6)

- The first request after the VPS dies takes ~3.2 s (the server-selection timeout), then M0 serves it.
- The VPS is then skipped for 30 s **per Vercel instance**. Each warm instance logs one
  `Database target 'db1.orfarchiv.news:27017' failed: …` per cooldown window while the VPS is down.
- With both targets down, requests return 503 after ~6 s.

Stopping `orfarchiv-db` for the failover test also stops the scraper's VPS writes. Afterwards, catch up
as in [S10](10-enable-dual-writes.md): `verify` → `sync --since <stop time>` → `verify`.

### Service-worker caveat

The installed PWA caches `news.search` with a `NetworkFirst` strategy and a `{ stories: [] }`
fallback, and `news.checkUpdates` with `NetworkOnly` falling back to `{ updateAvailable: false }`.
A backend problem can therefore surface to users as *empty results* rather than an error. Test in a
normal browser tab as well as the installed PWA.

## Acceptance criteria

- [x] Everything below verified on the `self-hosted-db` preview first, then on `develop.orfarchiv.news`;
      production is untouched.
- [x] `ORFARCHIV_DB_URLS` set in Vercel with the VPS first, using the read-only user.
- [x] `$currentOp` on the VPS shows `orfarchiv-ui` connections.
- [x] Keyword search works and latency matches or beats the M0 baseline.
- [x] **Semantic search returns non-empty, sensible results**, verified explicitly, with no
      `falling back to keyword search` log line.
- [x] Story-content lookup (`findOne` by url) works.
- [x] No failover log lines during normal operation.
- [x] Zero tRPC 503s.
- [x] A deliberate failover test: stop the VPS container, confirm the UI keeps serving from M0 with no
      user-visible error, restart, confirm traffic returns after the cooldown.
- [x] Tested in both a normal browser tab and the installed PWA.
- [x] Rollback verified: removing the variable and redeploying restores M0-only reads.

## Verification

See the [Runbook](#runbook). In short:

- `search keyword` / `search semantic` / `content` against the deployment return data with
  `x-vercel-cache: MISS`;
- `ui_conns` on the VPS counts the UI's connections;
- the failover test stops `orfarchiv-db`, the site keeps serving from M0, and after the restart and the
  ~30 s cooldown the connections return to the VPS;
- the scraper catches up with `verify` / `sync --since` / `verify`.

Watch the Vercel function logs throughout for `SearchError`, `Database target '…' failed`,
`falling back to keyword search` and 503s.

## Risks / open questions

- Do this at a low-traffic time, with the rollback command ready.
- The circuit-breaker cooldown (~30 s) means a flapping VPS would oscillate. If failover lines appear
  repeatedly, roll back first and investigate afterwards rather than watching it flap.

## Runbook

Two shells:

- **Laptop** (zsh, in `ui/`);
- **VPS** (in `tmux`, in `<compose-dir>`).

As in [S10](10-enable-dual-writes.md), passwords are read with `read -rs` and the variables are not
exported. All Vercel changes are made in the dashboard.

### 1. Helpers

Laptop:

```bash
SITE=<self-hosted-db-preview-url>      # the branch URL from the Vercel dashboard

trpc() {      # trpc <procedure> <json-input>; body lands in /tmp/s11.json
  curl -sS -G "$SITE/api/trpc/$1" \
    --data-urlencode "input=$2" --data-urlencode "_=$(uuidgen)" \
    -o /tmp/s11.json -w '%{http_code} %{time_total}s %header{x-vercel-cache}\n'
}
search() {
  trpc news.search "$1" && jq -c '{stories: (.result.data.stories | length), titles: [.result.data.stories[:3][].title], error: .error.json.data.code}' /tmp/s11.json
}
latest_url() { trpc news.search '{"searchRequestParameters":{}}' > /dev/null && jq -r '.result.data.stories[0].url' /tmp/s11.json; }
content() {
  trpc news.content "{\"url\":\"$1\"}" && jq -c '{id: .result.data.id, timestamp: .result.data.timestamp, html: (.result.data.contentHtml | length), error: .error.json.data.code}' /tmp/s11.json
}
KEYWORD='{"searchRequestParameters":{"textFilter":"wien"}}'
SEMANTIC='{"searchRequestParameters":{"textFilter":"hochwasser in niederösterreich","matchMode":"semantic"}}'

t() { curl -sS -o /dev/null -G "$SITE/api/trpc/news.search" --data-urlencode "input=$1" --data-urlencode "_=$(uuidgen)" -w '%{time_total}\n'; }
pct() { sort -n | awk '{ a[NR] = $1 * 1000 } END { printf "n=%d p50=%.0fms p95=%.0fms\n", NR, a[int(NR * 0.5) + 1], a[int(NR * 0.95) + 1] }'; }
lat() {
  echo -n 'keyword:  '; for i in {1..40}; do t "$KEYWORD"; done | pct
  echo -n 'semantic: '; for i in {1..20}; do t "$SEMANTIC"; sleep 1; done | pct    # stays under the 60/min rate limit
}
```

The `lat` numbers are end-to-end: CDN, function, database and, for semantic search, the embedding call.
They are only comparable with runs of `lat` from the same machine against the same deployment.

### 2. Pre-flight

Laptop, from the repo root:

```bash
scp .tasks/self-hosted-db/scripts/vector-check.js <vps>:~/vector-check.js
```

VPS:

```bash
cd <compose-dir>
read -rs "ORFARCHIV_DB_RO_PW?orfarchiv_ro password: " && echo
read -rs "ORFARCHIV_DB_ROOT_PW?orfarchiv_root password: " && echo
ORFARCHIV_DB_RO_URL="mongodb://orfarchiv_ro:${ORFARCHIV_DB_RO_PW}@db1.orfarchiv.news:27017/?tls=true&directConnection=true"
ORFARCHIV_DB_M0_LABEL=<cluster>.mongodb.net

ui_conns() {      # connections the UI holds on the VPS
  npx mongosh "mongodb://orfarchiv_root:${ORFARCHIV_DB_ROOT_PW}@127.0.0.1:27018/?directConnection=true" --quiet --eval '
    db.getSiblingDB("admin").aggregate([
      { $currentOp: { allUsers: true, idleConnections: true } },
      { $match: { appName: "orfarchiv-ui" } },
      { $count: "connections" },
    ]).forEach(printjson)'
}

npx mongosh "$ORFARCHIV_DB_RO_URL" --quiet --file ~/vector-check.js    # 4/4 passed
docker compose run --rm orfarchiv-db-backup verify                      # mid-minute, "All 2 targets agree."
ui_conns                                                                # nothing yet
```

Prepare the variable value in your password manager, not in a file or the shell history. It is one line:
the VPS URL, then `;`, then the **current** `ORFARCHIV_DB_URL` from Vercel, unchanged:

```
mongodb://orfarchiv_ro:<ro-pw>@db1.orfarchiv.news:27017/?tls=true&directConnection=true;<current ORFARCHIV_DB_URL>
```

URL-encode a password if it contains `@`, `:`, `/`, `;` or `%`.

### 3. Preview of `self-hosted-db`, still on M0

The branch is already pushed, so a preview deployment should exist. If not, push the branch or redeploy it
in the dashboard. The build must pass, including the submodule checkout.

```bash
trpc info '{}' && cat /tmp/s11.json      # "semanticSearchEnabled":true, else the Preview scope lacks the embedding env vars
search "$KEYWORD"                         # 200, MISS, stories > 0
search "$SEMANTIC"                        # 200, MISS, stories > 0, titles about floods
content "$(latest_url)"                   # 200, MISS, timestamp not null, html > 0
lat                                       # M0 baseline, record in Results
```

In the deployment's function logs (dashboard → the deployment → Logs), expect
`Using database targets: <cluster>.mongodb.net`.

### 4. Switch the preview to the VPS

In the Vercel dashboard:

1. Project → Settings → Environment Variables → add `ORFARCHIV_DB_URLS` with the value from step 2.
2. Environment: **Preview** only, branch **`self-hosted-db`**. Mark it **Sensitive**.
3. Deployments → latest `self-hosted-db` deployment → **Redeploy**. Environment variables only apply to new
   deployments.

Then, laptop:

```bash
search "$KEYWORD"; search "$SEMANTIC"; content "$(latest_url)"     # as in step 3
lat                                                                 # compare with the step 3 baseline
```

Logs:

- `Using database targets: db1.orfarchiv.news:27017, <cluster>.mongodb.net`;
- **no** `Database target '…' failed`, no `falling back to keyword search`, no 503.

VPS: `ui_conns` should show `{ connections: <n> }` with n ≥ 1.

### 5. Failover test (on the preview)

Not around the 03:00 backup. VPS:

```bash
ORFARCHIV_DB_OUTAGE_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose stop orfarchiv-db
```

Laptop:

```bash
for i in {1..5}; do search "$KEYWORD"; done    # all 200; one ~3.2 s per warm instance, the rest fast
search "$SEMANTIC"
content "$(latest_url)"
```

The logs show `Database target 'db1.orfarchiv.news:27017' failed: …` at most once per instance per 30 s,
with no credentials in the message. There is no 503 and no `SearchError`.

VPS:

```bash
docker compose start orfarchiv-db
docker compose ps orfarchiv-db                 # wait for "healthy"
```

Wait more than 30 s, run `search "$KEYWORD"` a few times on the laptop, then run `ui_conns` on the VPS:
the connections are back.

Catch up the scraper writes the VPS missed:

```bash
docker compose run --rm orfarchiv-db-backup verify
docker compose run --rm orfarchiv-db-backup sync \
  --from "$ORFARCHIV_DB_M0_LABEL" --to db1.orfarchiv.news:27017 --since "$ORFARCHIV_DB_OUTAGE_START"
docker compose run --rm orfarchiv-db-backup verify                      # exit 0
```

### 6. Merge to `develop`

Add the variable for `develop` first, so the merge deploys straight against the VPS. In the Vercel
dashboard, add `ORFARCHIV_DB_URLS` a second time with the same value: **Preview** only, branch **`develop`**,
**Sensitive**.

Then, on GitHub, open a pull request from `self-hosted-db` into `develop`, review it, merge it, and wait for
the `develop` deployment.

Then, laptop:

```bash
SITE=https://develop.orfarchiv.news
search "$KEYWORD"; search "$SEMANTIC"; content "$(latest_url)"     # as in step 3
lat                                                                 # compare with step 4
```

- The logs show the same lines as in step 4.
- `ui_conns` on the VPS counts the connections of both deployments.
- Repeat the checks by hand in a **normal browser tab** and in the **installed PWA** of
  `develop.orfarchiv.news`: search, semantic search, open a story. The PWA shows backend trouble as
  empty results, not as an error.

### 7. Credential leak check

In the Vercel log search, over the steps above: `orfarchiv_ro:` and `<m0-user>:` find **nothing**.
Redacted URLs look like `mongodb://***@`.

### 8. Rollback

In the Vercel dashboard:

1. Settings → Environment Variables → delete the `ORFARCHIV_DB_URLS` entry for branch `develop`.
2. Deployments → latest `develop` deployment → **Redeploy**.

`ORFARCHIV_DB_URL` is still set, so the logs show `Using database targets: <cluster>.mongodb.net`. Try
this once after step 6 (`search "$KEYWORD"` still works), then add the variable again and redeploy.

### 9. Cleanup

- In the Vercel dashboard, delete the `ORFARCHIV_DB_URLS` entry for branch `self-hosted-db`.
- The Preview variable scoped to `develop` stays: `develop` keeps reading from the VPS.
- Keep `ORFARCHIV_DB_URL`: it is the rollback path until M0 is retired ([S13](13-optional-second-target.md)).

## Results

### Preview of `self-hosted-db` (steps 1–5, 2026-09-30)

All checks passed.

| `lat` | keyword p50 | keyword p95 | semantic p50 | semantic p95 |
| --- | --- | --- | --- | --- |
| M0 (step 3) | 714 ms | 798 ms | 187 ms | 244 ms |
| VPS (step 4) | **571 ms** | **685 ms** | 232 ms | 605 ms |
| VPS, `develop` (step 6) | **516 ms** | **613 ms** | 198 ms | 288 ms |

- **Keyword search** is 143 ms faster at p50 and 113 ms faster at p95.
- **Semantic search** is 45 ms slower at p50. Its p95 of 605 ms rests on the one slowest of 20 samples,
  so it is a single outlier. S9 measured warm `$vectorSearch` on the VPS only 5 ms slower at p50.
  Step 6 confirms this: semantic search on `develop` is 11 ms slower at p50 and 44 ms at p95 than the
  M0 baseline, which is within run-to-run noise and small next to the embedding call.
- **`ui_conns`** showed 5 UI connections on the VPS. The old helper grouped by `effectiveUsers.user`,
  which idle connections do not carry, so `_id` was `null`. The `appName` match alone identifies the UI.
  The helper now just counts.
- **Failover test:** with `orfarchiv-db` stopped, the first request took ~4 s and every later one was
  fast. That is the 3 s server-selection timeout plus the M0 query and connect. After the restart and
  more than 30 s, `ui_conns` showed connections again.

### PR review fixes (before the merge)

CodeRabbit's review of [ui#267](https://github.com/Robin-w151/orfarchiv-ui/pull/267) led to two changes.
Both were checked again on the preview with `lat` and a quick failover test.

- **`timeoutMS: 4000`** in `DB_CLIENT_OPTIONS`. `Effect.timeout` only stops waiting and does not cancel
  the MongoDB operation. Without a driver timeout, a query that hangs while the connection stays open
  could hold one of the two pool connections indefinitely. The driver now aborts it before the 5 s
  Effect timeout.
- **CI hardening:** a workflow-level `permissions: contents: read` in `ci.yaml`, and
  `persist-credentials: false` on the recursive submodule checkouts in `ci.yaml` and `storybook.yaml`.

The third finding (`SearchError` lost across `runPromise`) does not apply to effect 4: `runPromise`
rejects with the original error, and the 503 mapping was verified live in S6. It was answered on the PR.

### `develop` (steps 6–9)

All checks passed (numbers in the table above): keyword search, semantic search, content lookup, the log lines, `ui_conns`, the
browser tab and the installed PWA, the credential leak check, and the rollback. `develop.orfarchiv.news`
now reads from the VPS with M0 as the fallback.

Production is still on M0. Releasing `develop` → `main` and setting `ORFARCHIV_DB_URLS` for Production
follows after a couple of weeks of stable operation on `develop`.
