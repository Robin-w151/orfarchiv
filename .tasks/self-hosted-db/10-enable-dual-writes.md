# S10 — Enable dual writes

**Owner:** You   **Repo:** ops   **Size:** S
**Depends on:** [S9](09-benchmark-and-gate.md) **and** [S5](05-scraper-multi-target-writes.md)   **Blocks:** [S11](11-point-ui-reads-at-vps.md)
**Status:** ✅ Done (2026-09-29) — scraper and backup write to the VPS and M0, verification passed, see [Results](#results)

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

- Releasing the multi-target `db` and `scraper` images and rolling them out single-target first.
- Set `ORFARCHIV_DB_URLS` on the scraper and backup containers.
- Observe for several days.

**Out of scope**

- UI configuration ([S11](11-point-ui-reads-at-vps.md)).

## Technical notes

### Release first, then switch

The multi-target code ([S3](03-db-multi-target.md), [S4](04-db-sync-and-verify.md),
[S5](05-scraper-multi-target-writes.md)) exists only on the `self-hosted-db` branches of `db` and
`scraper`. [S8](08-seed-and-parity.md) built the CLI from that branch because the released image had no
`sync`/`verify`. The production images are published by semantic-release on `main`:
`ghcr.io/robin-w151/orfarchiv-scraper`, and `ghcr.io/robin-w151/orfarchiv-db`, which replaces the old
`orfarchiv-db-backup` image.

So the rollout has two steps:

1. Merge and release, then deploy the new images with the **existing single `ORFARCHIV_DB_URL`**. This is
   the no-op the epic promises for every code story. It separates "new code in production" from
   "second target in production".
2. Only then switch to `ORFARCHIV_DB_URLS`.

The new images bring breaking changes that step 1 has to absorb:

| Change | Impact |
| --- | --- |
| Scraper uses subcommands ([S5](05-scraper-multi-target-writes.md)) | Default `CMD` is `scrape --poll`. A compose `command:` override such as `--poll --cron …` must become `scrape --poll --cron …` |
| `db` image renamed to `orfarchiv-db`, **no default `CMD`** | The image is the general `db` CLI now. Without a `command:`, it prints help and exits 0, so under `restart:` it loops silently and takes no backups. The backup service must set `command: ['backup', '--keep-running']` |
| `db` image has no `VOLUME` | `docker compose run` of `verify` / `sync` / `targets` no longer creates anonymous volumes. The backup service must mount its backup directory at `/app/backup` explicitly |
| Backups go to `<backupDir>/<label>/` ([S3](03-db-multi-target.md)) | Even with one target, new files land in `backup/<m0-label>/`. Old flat files stay where they are, and `restore` only finds them by explicit path |
| Failures exit 1 | A failed one-shot run is now visible to `restart:` policies and scripts. In `--poll` / `--keep-running` mode a failed tick is only logged |

### Configuration

Both containers read **one** secret file, `secrets/orfarchiv_db_urls`, through `ORFARCHIV_DB_URLS_FILE`.
It holds one URL per line, VPS first:

```text
mongodb://orfarchiv_rw:<pw>@db1.orfarchiv.news:27017/?tls=true&directConnection=true
mongodb+srv://<m0-rw-user>:<pw>@<cluster>.mongodb.net/
```

- **`directConnection=true` is required** on the VPS URL ([S7](07-vps-mongodb-stack.md)). Without it
  the driver follows the replica-set host list to the unresolvable container hostname.
- **Both containers use the rw users.** The backup job only needs read access, but a single file is
  simpler to maintain. It also lets `db sync` and `db verify` run through the backup service with
  `docker compose run`. `orfarchiv_ro` stays reserved for the UI ([S11](11-point-ui-reads-at-vps.md)).
- **Order** matters for logging, `--target` ergonomics and `verify`'s reference target, not for
  correctness. The scraper writes to all targets regardless of order.
- **Labels** are the URL authority without credentials: `db1.orfarchiv.news:27017` and
  `<cluster>.mongodb.net`. They show up in logs, in backup paths and in `--from` / `--to` / `--target`.

**File permissions matter.** Both images run as `USER 1000:1000`, and file-based compose secrets are
bind mounts that keep the host's owner and mode. A root-owned `chmod 600` file, as used for the root
secrets in S7, is unreadable in the container. Use `chown 1000:1000` and `chmod 400`.

**A broken secret fails quietly.** If the `_FILE` cannot be read, the apps log a warning and fall back
to `ORFARCHIV_DB_URLS`, then `ORFARCHIV_DB_URL`, then `mongodb://localhost`. So remove
`ORFARCHIV_DB_URL` from both services when switching, and check the result with the `targets`
subcommand before relying on it.

### Public endpoint, not the Docker network

The scraper connects to the VPS **through the public TLS endpoint** even though it runs on the
same host. That is simplest and exercises the same path the UI will use. Using the internal Docker
network name instead would be marginally faster but would test a path nothing else uses — prefer the
public endpoint so problems surface here rather than in S11. This supersedes the internal-URL note in
[S7](07-vps-mongodb-stack.md) step 2.

For the same reason, no `depends_on: orfarchiv-db` on the scraper or the backup job. M0 must keep
receiving writes while the VPS container is down.

### What to watch

| Signal | Where | Meaning |
| --- | --- | --- |
| Per-target write logs each tick | scraper logs | Both labels log `Inserted …` / `Nothing to insert.` and `Updated …` / `Nothing to update.`, no `Database target '<label>' failed` |
| `db verify` exit code | manual, daily | Targets still in agreement |
| Backup file counts | `backup/<label>/` | One directory per target, both filling nightly |
| VPS disk usage | `df -h`, `du -hs` | Growth rate is sane |
| Scrape tick duration | `persist=<n>ms` span in scraper logs | Writing to two targets has not slowed the tick meaningfully |

Run `db verify` daily for the observation period. Small transient drift after a target blip is
expected and is what `db sync` repairs; **persistent or growing** drift is the signal to stop and
investigate.

`verify` requires the exact same count, latest `timestamp` and missing-embedding count on every target,
and the scraper ticks every minute (second 0). Run it mid-minute. If it reports a one-off mismatch,
re-run it once before treating it as drift.

### How the outage test behaves

While the VPS is down, each tick connects to both targets in parallel and waits for the VPS connection
to fail (at most the driver's ~30 s server-selection timeout) before M0 is written. That is well inside
the 5-minute tick timeout.

Once the VPS is back, each tick re-plans **every** target against the current RSS feeds. Stories still
in a feed are inserted on the VPS by the next tick without any `sync`. Only stories that dropped out of
the feeds during the outage stay missing. So `verify` right after the restart may already be clean after
a short outage. That is correct behaviour, not a failed test. Keep the outage around 15 minutes and
always run `sync --since <outage start>` anyway.

## Acceptance criteria

- [x] New `db` and `scraper` images released and running single-target before the switch.
- [x] Both containers run with `ORFARCHIV_DB_URLS` set, credentials via `_FILE` secrets.
- [x] Every scrape tick logs a successful write to both targets.
- [x] Nightly backup produces one file per target, under per-label directories.
- [x] `db verify` exits zero on consecutive days (allowing for in-flight scrape differences).
- [x] Scrape tick duration has not regressed meaningfully.
- [x] No credentials in any log output.
- [x] A deliberate outage test: stop the VPS container briefly, confirm the scraper keeps writing to
      M0 and logs the failure, then confirm `db sync` repairs the gap.
- [x] Observed for at least several days before proceeding to S11.

## Verification

On the VPS, in the compose directory. The full sequence with setup is in the [runbook](#runbook).

```bash
docker compose run --rm orfarchiv-scraper targets            # both labels, VPS first
docker compose run --rm orfarchiv-db-backup targets          # same
docker compose logs -f orfarchiv-scraper                     # per-target writes each tick
docker compose run --rm orfarchiv-db-backup verify           # daily, expect "All 2 targets agree.", exit 0
ls -l backup/*/                                              # one dir per target, one file per night each

# Deliberate outage test
ORFARCHIV_DB_OUTAGE_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose stop orfarchiv-db
# ~15 minutes: scraper logs "Database target 'db1.orfarchiv.news:27017' failed" and keeps writing to M0
docker compose start orfarchiv-db
docker compose run --rm orfarchiv-db-backup verify           # drift expected (may already be clean)
docker compose run --rm orfarchiv-db-backup sync \
  --from "$ORFARCHIV_DB_M0_LABEL" --to "$ORFARCHIV_DB_VPS_LABEL" --since "$ORFARCHIV_DB_OUTAGE_START"
docker compose run --rm orfarchiv-db-backup verify           # expect exit 0

# Credential leak check: the real passwords must not appear
docker compose logs orfarchiv-scraper orfarchiv-db-backup 2>&1 \
  | grep -cF -e "$ORFARCHIV_DB_RW_PW" -e "$ORFARCHIV_DB_M0_PW"          # expect 0
```

## Risks / open questions

- The outage test is the most valuable part of this story — it exercises the exact failure mode the
  design exists for. Do not skip it because everything looks healthy.
- Backup disk growth is now doubled and nothing prunes `backup/`. Watch it here and decide on
  retention in [S12](12-monitoring-and-scheduled-verify.md).
- The VPS backup is now taken over the public TLS path from the same host, so each nightly run pulls the
  whole collection out through nginx and back in. That is harmless at ~450k documents, but
  `BACKUP_TIMEOUT` (5 minutes per target) is the limit to watch as the data grows.
- The backup job now holds rw credentials. It only reads, but a bug in it could write. That is accepted
  in exchange for maintaining a single secret file.

## Runbook

Do the steps in order. `<vps>` is your SSH host alias and `<compose-dir>` the directory of the VPS compose
file. Service names are `orfarchiv-scraper` and `orfarchiv-db-backup`; adjust if yours differ. As in
[S8](08-seed-and-parity.md), passwords are read with `read -rs` (zsh) so none end up in the shell history,
and the runbook variables are not exported. Keep one `tmux` pane for the whole session.

### 0. Release the images

From the laptop, in each of `db` and `scraper`:

```bash
gh pr create --base main --head self-hosted-db --title "feat: multi target support"
# review, wait for CI, merge
gh run watch                                  # release + image jobs on main
git fetch --tags && git describe --tags --abbrev=0   # note the version, e.g. v3.0.0
```

Both releases change behaviour in breaking ways (see [Release first](#release-first-then-switch)), so
pin the exact versions in step 1 rather than relying on `latest`.

### 1. Single-target rollout (no-op)

On the VPS, back up the compose file first:

```bash
cd <compose-dir>
cp docker-compose.yml docker-compose.yml.pre-s10
```

In the compose file, for both services:

- Pin the new image versions from step 0 (`ghcr.io/robin-w151/orfarchiv-scraper:<version>`,
  `ghcr.io/robin-w151/orfarchiv-db:<version>`). The service name `orfarchiv-db-backup` stays. Only its
  `image:` changes.
- If `orfarchiv-scraper` overrides `command:`, prefix it with `scrape`, e.g.
  `command: ['scrape', '--poll', '--cron', '…']`.
- Give `orfarchiv-db-backup` an explicit command, and keep any existing `--cron` override:
  `command: ['backup', '--keep-running']`.
- Make sure `orfarchiv-db-backup` mounts its backup directory, e.g. `./backup:/app/backup`. The image no
  longer declares a `VOLUME`.
- Leave `ORFARCHIV_DB_URL` as it is.

The new package on ghcr may be private after its first publish. If the VPS pulls without `docker login`,
set `orfarchiv-db` to public in the package settings first.

```bash
docker compose pull orfarchiv-scraper orfarchiv-db-backup
docker compose up -d orfarchiv-scraper orfarchiv-db-backup
docker compose ps orfarchiv-db-backup                        # "Up", not "Restarting" / "Exited"
docker compose logs --since 5m orfarchiv-db-backup           # no usage/help text
docker compose run --rm orfarchiv-scraper targets            # one label: <cluster>.mongodb.net
docker compose logs -f --since 5m orfarchiv-scraper          # a normal tick against M0, no errors
```

Take one backup now rather than waiting until 03:00, to check the new per-label layout and write
permissions:

```bash
docker compose run --rm orfarchiv-db-backup backup           # one-shot, exits
ls -l backup/*/                                              # backup/<cluster>.mongodb.net/<timestamp>.json
```

Let it run for at least a few hours, ideally over one nightly backup. Then record the **baseline tick
duration**. Every log line inside the write step carries a `persist=<n>ms` span, and each tick ends with
`Nothing to update.` or `Updated story IDs: …`:

```bash
tick_stats() {
  docker compose logs --no-log-prefix --since "$1" orfarchiv-scraper \
    | grep -E 'message="?(Nothing to update\.|Updated story IDs)' \
    | grep -oE ' persist=[0-9]+ms' | grep -oE '[0-9]+' | sort -n \
    | awk '{ a[NR] = $1 } END { print "n=" NR, "p50=" a[int(NR * 0.5) + 1] "ms", "p95=" a[int(NR * 0.95) + 1] "ms" }'
}
tick_stats 6h
```

With two targets there are two such lines per tick, so the post-switch numbers are per target.

### 2. Secret file

```bash
read -rs "ORFARCHIV_DB_RW_PW?orfarchiv_rw password: " && echo
read -rs "ORFARCHIV_DB_M0_PW?M0 password: " && echo
ORFARCHIV_DB_VPS_LABEL=db1.orfarchiv.news:27017
ORFARCHIV_DB_M0_LABEL=<cluster>.mongodb.net

printf '%s\n%s\n' \
  "mongodb://orfarchiv_rw:${ORFARCHIV_DB_RW_PW}@${ORFARCHIV_DB_VPS_LABEL}/?tls=true&directConnection=true" \
  "mongodb+srv://<m0-rw-user>:${ORFARCHIV_DB_M0_PW}@${ORFARCHIV_DB_M0_LABEL}/" \
  > secrets/orfarchiv_db_urls
sudo chown 1000:1000 secrets/orfarchiv_db_urls
sudo chmod 400 secrets/orfarchiv_db_urls
```

URL-encode a password if it contains `@`, `:`, `/` or `%`. The generated S7 passwords do not.

### 3. Compose changes

For **both** `orfarchiv-scraper` and `orfarchiv-db-backup`:

```yaml
    environment:
      # remove ORFARCHIV_DB_URL / ORFARCHIV_DB_URL_FILE
      ORFARCHIV_DB_URLS_FILE: /run/secrets/orfarchiv_db_urls
    secrets:
      - orfarchiv_db_urls
```

And merge into the top-level `secrets:`:

```yaml
secrets:
  orfarchiv_db_urls:
    file: ./secrets/orfarchiv_db_urls
```

If the scraper's old `ORFARCHIV_DB_URL` came from its own secret, keep that secret defined for now; it is
the rollback path. Do **not** add `depends_on: orfarchiv-db`.

### 4. Pre-flight, before restarting anything

`docker compose run` uses the edited config, while the running containers keep the old one:

```bash
docker compose config -q                                     # file is valid
docker compose run --rm orfarchiv-scraper targets            # 1. db1.orfarchiv.news:27017  2. <cluster>.mongodb.net
docker compose run --rm orfarchiv-db-backup targets          # same two labels
docker compose run --rm orfarchiv-db-backup verify           # mid-minute; "All 2 targets agree.", exit 0
```

If `targets` shows `localhost` or only M0, the secret was not read. Look for the warning line above
the output, and check the owner and mode from step 2.

If `verify` reports drift (the VPS has had no writes since S8), catch up first:

```bash
docker compose run --rm orfarchiv-db-backup sync \
  --from "$ORFARCHIV_DB_M0_LABEL" --to "$ORFARCHIV_DB_VPS_LABEL" --since <last S8 sync, e.g. 2026-09-26T13:00:00Z>
docker compose run --rm orfarchiv-db-backup verify
```

### 5. Switch on

```bash
docker compose up -d orfarchiv-scraper orfarchiv-db-backup
docker compose ps orfarchiv-scraper orfarchiv-db-backup      # both "Up"
docker compose logs -f --since 1m orfarchiv-scraper
```

Per tick, expect:

- `Connecting to 'db1.orfarchiv.news:27017'...` and `Connecting to '<cluster>.mongodb.net'...`;
- insert/update lines carrying both label spans, e.g. `db1.orfarchiv.news:27017=…ms`;
- no `Database target '…' failed`.

Then take a one-shot backup of both targets:

```bash
docker compose run --rm orfarchiv-db-backup backup
ls -l backup/*/                                              # a new file in each of the two label dirs
docker compose run --rm orfarchiv-db-backup verify           # mid-minute, exit 0
```

### 6. Credential leak check

In the same pane, where the passwords from step 2 are still set:

```bash
docker compose logs orfarchiv-scraper orfarchiv-db-backup 2>&1 \
  | grep -cF -e "$ORFARCHIV_DB_RW_PW" -e "$ORFARCHIV_DB_M0_PW"          # expect 0
docker compose logs orfarchiv-scraper orfarchiv-db-backup 2>&1 | grep -c 'mongodb.*://[^*]*:[^*]*@'   # expect 0
```

Repeat this after the outage test, which is the path most likely to print a URL inside a driver error.

### 7. Outage test

Pick a quiet window, well away from the 03:00 backup.

```bash
ORFARCHIV_DB_OUTAGE_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose stop orfarchiv-db
docker compose logs -f --since 1m orfarchiv-scraper
```

For about 15 minutes, expect each tick to:

- log `Database target 'db1.orfarchiv.news:27017' failed: Failed to connect to DB.` (or a timeout);
- still log inserts and updates for `<cluster>.mongodb.net`;
- take up to ~30 s longer while the VPS connection times out.

Then:

```bash
docker compose start orfarchiv-db
docker compose ps orfarchiv-db                               # wait for "healthy"
docker compose run --rm orfarchiv-db-backup verify           # drift expected, may already be clean (see technical notes)
docker compose run --rm orfarchiv-db-backup sync \
  --from "$ORFARCHIV_DB_M0_LABEL" --to "$ORFARCHIV_DB_VPS_LABEL" --since "$ORFARCHIV_DB_OUTAGE_START" --dry-run
docker compose run --rm orfarchiv-db-backup sync \
  --from "$ORFARCHIV_DB_M0_LABEL" --to "$ORFARCHIV_DB_VPS_LABEL" --since "$ORFARCHIV_DB_OUTAGE_START"
docker compose run --rm orfarchiv-db-backup verify           # exit 0
```

Record the result in [Results](#results): how many stories `verify` reported missing before the sync,
and how many `sync` copied.

### 8. Daily observation, several days

Once a day, mid-minute:

```bash
cd <compose-dir>
docker compose run --rm orfarchiv-db-backup verify; echo "exit $?"
ls -l backup/*/ | tail -n 20                                 # last night's file in each label dir
du -hs backup/*/                                             # backup growth per target
df -h /                                                      # disk
docker compose logs --since 24h orfarchiv-scraper 2>&1 | grep -c "Database target '.*' failed"   # expect 0
tick_stats 24h                                               # from step 1; compare with the baseline
```

Fill in the table under [Results](#results). Stop and investigate on persistent or growing drift, on
repeated target failures, or when the tick p95 climbs well above the baseline.

### 9. Rollback

Any time, without data loss (M0 keeps every story throughout):

```bash
cp docker-compose.yml.pre-s10 docker-compose.yml             # or: drop the VPS line from secrets/orfarchiv_db_urls
docker compose up -d orfarchiv-scraper orfarchiv-db-backup
docker compose run --rm orfarchiv-scraper targets            # M0 only
```

Before switching back on later, catch up with `sync --since <rollback time>`.

### 10. Cleanup, after S10 is done

```bash
rm docker-compose.yml.pre-s10
# remove the old ORFARCHIV_DB_URL secret definition and file, if one existed
```

## Results

- **Rollout:** new `db` and `scraper` images released and deployed single-target first. The `db` image
  was renamed to `ghcr.io/robin-w151/orfarchiv-db`, with no default `CMD` and no `VOLUME`. Then both
  containers were switched to `ORFARCHIV_DB_URLS_FILE`, and all verification steps passed.
- **Duplicates found after the outage test:** `verify` reported db1 13 stories ahead of M0. The cause
  was duplicate `id`s: 15 extra documents on db1 and 2 on M0, so both held the same number of distinct
  stories and none were missing. `id` was never unique, and two writers can insert the same new story:
  - on db1, the post-outage `db sync` raced with the scraper re-inserting the same recent stories;
  - on both targets, the second scraper that runs as a backup inserts the same new stories on the same
    schedule.

  Both targets were deduplicated and `verify` agrees again.
- **Unique `id`:** `id` is now unique on both targets, so duplicates are rejected.
  - `db`: `id_asc` is a unique index. `setup` recreates changed indexes and refuses if duplicates exist,
    and `verify` compares the `unique` flag.
  - `scraper`: inserts with `ordered: false` and skips duplicate-key errors, logging them as
    `Skipped already existing story IDs`.
  - Applied to both targets after deduplication, with `db setup` followed by `db verify`.
