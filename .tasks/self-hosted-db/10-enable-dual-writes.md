# S10 — Enable dual writes

**Owner:** You   **Repo:** ops   **Size:** S
**Depends on:** [S9](09-benchmark-and-gate.md) **and** [S5](05-scraper-multi-target-writes.md)   **Blocks:** [S11](11-point-ui-reads-at-vps.md)

## Goal

Point the scraper and the backup job at **both** databases in production, and let them run long
enough to trust the arrangement.

## Why

This is the first production traffic to the VPS, and it is deliberately **write** traffic only —
reads still come from M0, so a problem here degrades nothing a user can see. It is the safe way to
find out whether multi-write behaves under real conditions before anything depends on it.

It also satisfies the epic's "keep M0 up to date" requirement from this point onward: both databases
receive every story.

## Scope

**In scope**

- Set `ORFARCHIV_DB_URLS` on the scraper and backup containers.
- Observe for several days.

**Out of scope**

- UI configuration ([S11](11-point-ui-reads-at-vps.md)).

## Technical notes

### Configuration

On the VPS compose stack, both containers swap `ORFARCHIV_DB_URL` for `ORFARCHIV_DB_URLS`:

```
ORFARCHIV_DB_URLS=mongodb://orfarchiv_rw:<pw>@<vps-host>:27017/?tls=true
mongodb+srv://<user>:<pw>@<m0-host>/
```

Order matters for logging and `--target` ergonomics, not for correctness — the scraper writes to all
targets regardless of order.

Prefer the `_FILE` indirection (`ORFARCHIV_DB_URLS_FILE`) with a Docker secret, since the value now
contains two sets of credentials. Newline-per-URL is the natural format in a file.

Note the scraper connects to the VPS **through the public TLS endpoint** even though it runs on the
same host. That is simplest and exercises the same path the UI will use. Using the internal Docker
network name instead would be marginally faster but would test a path nothing else uses — prefer the
public endpoint so problems surface here rather than in S11.

### What to watch

| Signal | Where | Meaning |
| --- | --- | --- |
| Per-target write logs each tick | scraper logs | Both targets receiving writes |
| `db verify` exit code | manual, daily | Targets still in agreement |
| Backup file counts | `.backup/<label>/` | One directory per target, both filling nightly |
| VPS disk usage | `df -h` | Growth rate is sane |
| Scrape tick duration | scraper logs | Writing to two targets has not slowed the tick meaningfully |

Run `db verify` daily for the observation period. Small transient drift after a target blip is
expected and is what `db sync` repairs; **persistent or growing** drift is the signal to stop and
investigate.

## Acceptance criteria

- [ ] Both containers run with `ORFARCHIV_DB_URLS` set, credentials via `_FILE` secrets.
- [ ] Every scrape tick logs a successful write to both targets.
- [ ] Nightly backup produces one file per target, under per-label directories.
- [ ] `db verify` exits zero on consecutive days (allowing for in-flight scrape differences).
- [ ] Scrape tick duration has not regressed meaningfully.
- [ ] No credentials in any log output.
- [ ] A deliberate outage test: stop the VPS container briefly, confirm the scraper keeps writing to
      M0 and logs the failure, then confirm `db sync` repairs the gap.
- [ ] Observed for at least several days before proceeding to S11.

## Verification

```bash
# On the VPS
docker compose logs -f orfarchiv-scraper        # per-target writes each tick
db verify                                        # daily, expect exit 0
ls -R /path/to/.backup/                          # one dir per target

# Deliberate outage test
docker compose stop orfarchiv-db
# wait for a few scrape ticks; scraper should warn and keep writing to M0
docker compose start orfarchiv-db
db verify                                        # expect drift
db sync --from <m0> --to <vps>
db verify                                        # expect exit 0

# Credential leak check
docker compose logs orfarchiv-scraper | grep -i "password\|@.*:.*@" && echo LEAK || echo clean
```

## Risks / open questions

- The outage test is the most valuable part of this story — it exercises the exact failure mode the
  design exists for. Do not skip it because everything looks healthy.
- Backup disk growth is now doubled and nothing prunes `.backup/`. Watch it here and decide on
  retention in [S12](12-monitoring-and-scheduled-verify.md).
