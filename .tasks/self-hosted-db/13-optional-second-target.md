# S13 — *(Optional)* Second self-hosted target; retire M0

**Owner:** You   **Repo:** infra   **Size:** M
**Depends on:** [S12](12-monitoring-and-scheduled-verify.md)   **Blocks:** nothing

## Goal

Add a second self-hosted MongoDB instance as a third target, so that M0 can be switched off without
losing redundancy.

## Why

This is the original "optional" requirement — a cluster of at least two servers for reliability, so
M0 can sometimes be turned off.

A conventional replica set is not available (see the epic: atlas-local is single-node, and
self-hosted Atlas Search does not exist on community `mongod`). What the N-target design gives
instead is two independent databases, both written by the scraper, with the UI failing over between
them. That delivers the practical benefit — lose one, keep serving — without a replica set.

**The point of this story is that it requires no code change at all.** Everything from S3, S5 and S6
is already N-target; adding a third is configuration plus the infra work.

## Scope

**In scope**

- A second host running the same stack.
- Seeding it and adding it to every consumer's target list.
- Optionally removing M0.

**Out of scope**

- Any code change. If one turns out to be needed, that is a defect in the S3/S5/S6 implementation.

## Technical notes

### Placement

Put it on a **different host** — ideally a different provider or at least a different failure domain.
Two containers on one VPS share a disk, a kernel and a power supply, which defeats the purpose.

Keep it in or near Frankfurt for the same latency reasons as the first
([S9](09-benchmark-and-gate.md)).

### Procedure

Repeat the established stories against the new host:

1. [S7](07-vps-mongodb-stack.md) — stack, TLS, auth, firewall. Reuse the templates and the pinned
   image digest.
2. [S8](08-seed-and-parity.md) — `db setup --target <new>`, then `db sync --from <vps1> --to <new>`,
   then wait for the vector index and `db verify`.
3. Add it to `ORFARCHIV_DB_URLS` for the scraper and backup ([S10](10-enable-dual-writes.md)).
4. Add it to the UI's list ([S11](11-point-ui-reads-at-vps.md)), as priority 2 with M0 dropping to 3.
5. Observe for several days with `db verify` before relying on it.

### Retiring M0

Only after the second self-hosted target has been stable for a meaningful period:

- Remove M0 from `ORFARCHIV_DB_URLS` everywhere.
- Keep the cluster itself for a while before deleting it — it is a free, off-site, independently
  operated copy of the data, which has value as a cold spare even when unused.
- Take a final `db backup` of M0 before decommissioning.

Note that once M0 is gone, both remaining copies are self-operated. The backup files become the only
independent recovery path, which raises the stakes on the retention policy from
[S12](12-monitoring-and-scheduled-verify.md). Consider off-site backup storage at that point.

### Consistency with three targets

The scraper writes to all three; failure of any one is tolerated. The UI tries them in order. `db
verify` compares all three. Nothing is special-cased — which is the design goal being validated here.

## Acceptance criteria

- [ ] Second instance on a **separate host**, running the same pinned image, with TLS and auth.
- [ ] Seeded, embeddings intact, vector index queryable.
- [ ] Added to scraper, backup and UI target lists.
- [ ] `db verify` reports all three in agreement.
- [ ] **No code change was required** in any repo.
- [ ] Failover test: stop the primary, confirm the UI serves from the second self-hosted target.
- [ ] If retiring M0: a final backup taken, removed from all target lists, cluster retained for a
      cool-down period.

## Verification

```bash
# After adding the third target
db verify                                  # all three agree

# Failover chain
docker compose stop orfarchiv-db           # on host 1
#  -> UI serves from host 2; confirm semantic search still returns results
docker compose start orfarchiv-db

# Confirm no code changed
git -C db diff --stat main
git -C scraper diff --stat main
git -C ui diff --stat main                 # all empty
```

## Risks / open questions

- Two self-hosted instances mean twice the operational surface: two sets of certificates, two disks,
  two image upgrades. Weigh that against what M0 costs (nothing) before retiring it.
- With M0 gone there is no longer an independently operated copy. Off-site backup storage becomes
  materially more important.
