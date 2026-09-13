# S12 — Monitoring + scheduled verify

**Owner:** You   **Repo:** ops   **Size:** S
**Depends on:** [S11](11-point-ui-reads-at-vps.md)   **Blocks:** [S13](13-optional-second-target.md)

## Goal

Make drift and disk exhaustion **noisy** rather than silent, now that the self-hosted database serves
production reads.

## Why

Two failure modes in this architecture are quiet by nature:

1. **Drift.** N independent databases are only as consistent as the writes that reach them. A target
   that misses writes stays queryable and returns *plausible but stale* results. Nothing alerts.
2. **Disk.** Backups now run N× per night and **nothing prunes `.backup/`**. At ~104 MB per file per
   target, this grows steadily until the volume fills — which takes down `mongod` as well as the
   backup job.

Neither is visible until a user notices something wrong, which is exactly the situation to avoid once
M0 is no longer the primary.

## Scope

**In scope**

- Cron'd `db verify` with alerting on non-zero exit.
- Disk-usage monitoring on the VPS volumes.
- A retention policy for `.backup/`.

**Out of scope**

- A full metrics stack. This is about catching the two specific failure modes above.

## Technical notes

### Scheduled verify

`db verify` already exits non-zero on divergence ([S4](04-db-sync-and-verify.md)), so it works as a
cron check directly. Schedule it **after** the nightly backup completes, so a slow backup does not
overlap.

Alert on non-zero exit through whatever channel you already read. Include the command output — the
per-target counts are what make the alert actionable.

Expect small transient drift on a live system: stories scraped between one target's write and
another's will differ momentarily. Consider a tolerance (e.g. a handful of documents) rather than
strict equality, or compare against the previous run's delta so only *growing* drift alerts. The
distinction that matters is transient versus persistent.

### Disk

Monitor both volumes plus the backup volume. Use the footprint recorded in
[S8](08-seed-and-parity.md) to set thresholds. Alert at a level that leaves time to act — filling the
disk takes `mongod` down, not just the backup.

### Backup retention

Currently nothing deletes old backups. With N targets this compounds. Decide a policy — for example
keep the last 7 daily files per target, plus one per month — and implement it either as a prune step
in the backup container or a separate cron.

Note the backup files are the disaster-recovery path of last resort. Retention should be generous
enough to survive a problem that is not noticed immediately.

### Security follow-up

[S7](07-vps-mongodb-stack.md) left one question open: whether fail2ban on repeated MongoDB auth
failures is worth adding to an internet-facing endpoint. Decide it here and record the decision
either way.

## Acceptance criteria

- [ ] `db verify` runs on a schedule, after the nightly backup.
- [ ] A non-zero exit produces an alert that reaches you, including the output.
- [ ] Verified by deliberately introducing drift and confirming the alert fires.
- [ ] Disk usage monitored on the data, mongot and backup volumes, with thresholds based on the S8
      footprint.
- [ ] A backup retention policy is implemented and observed to prune.
- [ ] The fail2ban question from S7 is decided and recorded.

## Verification

```bash
# Drift alert fires
mongosh "<vps>" --eval 'db.news.deleteOne({})'
# wait for the scheduled run (or trigger manually)
db verify; echo "exit=$?"        # non-zero, alert received
db sync --from <m0> --to <vps>
db verify; echo "exit=$?"        # zero

# Retention prunes
ls -la /path/to/.backup/<label>/ # count stays at the policy limit after several nights

# Disk alerting threshold is reachable and sane
df -h
```

## Risks / open questions

- Alert fatigue: if transient drift alerts nightly, the alert stops being read. Tune the tolerance
  until a firing alert reliably means something is actually wrong.
