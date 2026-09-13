# S11 — Point UI reads at the VPS

**Owner:** You   **Repo:** ops   **Size:** S
**Depends on:** [S10](10-enable-dual-writes.md) **and** [S6](06-ui-database-service.md)   **Blocks:** [S12](12-monitoring-and-scheduled-verify.md)

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

## Technical notes

### Configuration

In Vercel project settings (all environments that should use it):

```
ORFARCHIV_DB_URLS=mongodb://app-read:<pw>@<vps-host>:27017/?tls=true
mongodb+srv://<user>:<pw>@<m0-host>/
```

Use the **read-only** user for the UI. It needs no write privileges, and `$vectorSearch` requires
only read.

`ORFARCHIV_DB_URL` can stay set as a harmless fallback, or be removed once `ORFARCHIV_DB_URLS` is
confirmed working.

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

Semantic search deserves specific attention: if the vector index is unhealthy, `$vectorSearch`
returns **empty results without erroring**, which the UI cannot distinguish from "no matches". The
failover logic will not trigger, because nothing failed. Check semantic search explicitly rather than
assuming silence means success.

### Service-worker caveat

The installed PWA caches `news.search` with a `NetworkFirst` strategy and a `{ stories: [] }`
fallback, and `news.checkUpdates` with `NetworkOnly` falling back to `{ updateAvailable: false }`.
A backend problem can therefore surface to users as *empty results* rather than an error. Test in a
normal browser tab as well as the installed PWA.

## Acceptance criteria

- [ ] `ORFARCHIV_DB_URLS` set in Vercel with the VPS first, using the read-only user.
- [ ] Keyword search works and latency matches or beats the S9 numbers.
- [ ] **Semantic search returns non-empty, sensible results** — verified explicitly.
- [ ] Story-content lookup (`findOne` by url) works.
- [ ] No failover log lines during normal operation.
- [ ] Zero tRPC 503s.
- [ ] A deliberate failover test: stop the VPS container, confirm the UI keeps serving from M0 with no
      user-visible error, restart, confirm traffic returns after the cooldown.
- [ ] Tested in both a normal browser tab and the installed PWA.
- [ ] Rollback verified: removing the variable and redeploying restores M0-only reads.

## Verification

```bash
# After deploying, from the browser and from curl against the public site:
#  - keyword search
#  - semantic search (must return results, not an empty list)
#  - opening a story (content lookup)

# Deliberate failover test
docker compose stop orfarchiv-db      # on the VPS
#  -> site keeps working, served from M0; logs show the fallback
docker compose start orfarchiv-db
#  -> after the ~30s cooldown, traffic returns to the VPS
```

Watch Vercel function logs throughout for `SearchError`, failover warnings and 503s.

## Risks / open questions

- Do this at a low-traffic time, with the rollback command ready.
- The circuit-breaker cooldown (~30 s) means a flapping VPS would oscillate. If failover lines appear
  repeatedly, roll back first and investigate afterwards rather than watching it flap.
