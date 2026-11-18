# S12 — Monitoring + scheduled verify

**Owner:** You   **Repo:** ops   **Size:** S
**Depends on:** [S11](11-point-ui-reads-at-vps.md)   **Blocks:** [S13](13-optional-second-target.md)
**Status:** ✅ Done (2026-10-03) — scheduled verify, Telegram alerts, disk check and backup retention deployed, all runbook checks passed, see [Results](#results)

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

### Overview

Everything runs in the `db` CLI image (`ghcr.io/robin-w151/orfarchiv-db`), so there is no host cron
and no extra tooling on the VPS:

| Service | Command | Does |
| --- | --- | --- |
| `orfarchiv-db-backup` *(existing)* | `backup --keep-running …` | Nightly backup at 03:00, then retention prune, then disk check |
| `orfarchiv-db-verify` *(new)* | `verify --keep-running` | Nightly `verify` at 04:02:45, retried once before alerting |

Both send alerts to **Telegram**. Every message starts with `[<ORFARCHIV_SERVER_LABEL>]`, because the
backup also runs on a second server.

### Notifications

| Variable | Meaning |
| --- | --- |
| `ORFARCHIV_TELEGRAM_BOT_TOKEN` / `_FILE` | Bot token from @BotFather. Use the `_FILE` secret |
| `ORFARCHIV_TELEGRAM_CHAT_ID` / `_FILE` | Chat that receives the alerts |
| `ORFARCHIV_SERVER_LABEL` / `_FILE` | Prefix of every message, e.g. `vps-fra`. Falls back to the hostname, which in a container is the container ID, so always set it |

- At startup, `--keep-running` services log `Notifications via Telegram enabled.` or warn
  `Notifications disabled: …`, so a missing configuration is visible right after deploy.
- Without token or chat ID the notifier logs `Notifications disabled: …` once and then
  `Notification not sent: <message>` for each alert. Nothing fails.
- Each send attempt times out after **10 s**. Transport errors, timeouts, 429 and 5xx are retried
  **once** after 5 s; other 4xx (wrong token 401, wrong chat ID 400) fail at once, since retrying cannot
  fix configuration. Worst case ≈ 25 s per alert.
- A failed send is logged as `Failed to send notification: <reason> (status <n>): <Telegram description>` or `… timed out after
  10s`, and never fails the backup or verify run. The token is part of the request URL, so the request
  is never logged.
- Message text goes through the same `redact()` as the logs, so a MongoDB URL inside an error (e.g. an
  `Unreachable` target) never reaches Telegram with its credentials.
- Messages are truncated to Telegram's 4096-character limit.

| Alert | Sent when |
| --- | --- |
| `🔴 orfarchiv verify failed` + per-target counts | `verify` fails twice in a row, 2 minutes apart |
| `🔴 orfarchiv Backup of '<label>' failed: …` | A target's backup fails (before, `--keep-running` only logged it) |
| `🔴 orfarchiv Pruning backups of '<label>' failed: …` | Retention could not delete files |
| `🟠 orfarchiv disk usage limit <limit> reached` + usage per path | Any `--disk-path` reached `--disk-max-usage` |
| `🔴 orfarchiv Disk check failed: …` | A `--disk-path` could not be read. One alert per path; the limit is still checked on the readable paths |
| `🔴 orfarchiv verify crashed` / `backup crashed` + message | A defect (bug) inside a scheduled run. Logged with stack; the cron loop continues |

### Scheduled verify

`db verify --keep-running [--cron "45 2 4 * * *"]`. One-shot `db verify` is unchanged: no
notification, exit 1 on divergence.

- **04:02:45** is well after the 03:00 backup (15-minute timeout per target, all targets concurrently, so finished by 03:15 at the latest).
  Second 45 avoids the scraper's tick at second 0, and minute 2 avoids the second scraper
  (`30 */5 * * * *`).
- **Transient vs. persistent drift.** `verify` needs the exact same count, latest `timestamp` and
  missing-embedding count everywhere, so a scrape landing between the per-target reads fails it once.
  On failure it waits **2 minutes** and runs again (04:04:45, also clear of both scrapers). Only a second
  failure alerts. A drift that survives two minutes is persistent; that is the signal that matters.
  No count tolerance: since `id` is unique (S10), any count difference that persists is real.
- **Reading the log.** The first failure is a warning ending in `Retrying in 2m...`; that suffix only
  appears when a retry actually follows. The final failure is an error line without it, followed by
  the alert. So `warn … Retrying` alone means "transient, recovered", `error Verification failed` means
  "alerted".
- The alert carries every target's line, e.g.
  `[db1.orfarchiv.news:27017] 443,329 stories, latest …, 132 without embedding, indexes ok`, and the
  failure summary naming the diverging target.

### Backup retention

`--keep-daily <n>` and `--keep-monthly <n>`. Without either flag nothing is pruned.

- Per target directory `backup/<label>/`, after **that target's backup succeeded**. A failing backup
  never deletes anything.
- Keeps the newest file of each of the newest *n* days, and the newest file of each of the newest *m*
  months. The newest file overall is always kept.
- Only files named `YYYY-MM-DDTHHMMSSZ.json` are considered. `.partial` files, the old flat backups in
  `backup/` and anything else are never touched.
- **Policy: 7 daily + 12 monthly.** About 19 files × ~110 MB ≈ 2 GB per target, ~4.2 GB for two. A
  problem noticed weeks later can still be rolled back to a month-start state, and a year of monthly
  snapshots covers slow corruption.

The first run with the flags prunes the existing backlog at once.

### Disk

`--disk-path <path>` (repeatable, default the backup dir) and `--disk-max-usage <limit>` (default
`80%`). The limit is either a percentage of the filesystem (`80%`) or an absolute amount in use
(`60GiB`, `500MiB`, `1TiB`, or decimal `60GB`; parsed by effect's `ByteSize`). A bare number or `60G` is rejected.

- Checked after every backup, one-shot or scheduled. Every run logs one `Disk usage …` line per path
  and per backup label, so growth is visible in the logs even without an alert.
- Each path is checked on its own. An unreadable path (e.g. a missing mount) is logged as
  `<path>: unreadable` and alerted, but does not stop the limit check on the other paths. The
  per-label backup sizes are informational: if they cannot be read, a warning is logged and the check
  continues without them.
- Numbers come from `statfs(2)`, the same call `df` uses: used = `(blocks − bfree) × bsize`, use % =
  `used / (used + bavail × bsize)`, which is `df`'s `Use%`. Root-reserved blocks count as unavailable.
- In a container, `statfs` on a bind mount or named volume reports the **host filesystem behind it**.
  That is why the data and mongot volumes are mounted read-only into the backup service. On a single
  disk all three paths report the same numbers.
- **Threshold.** S8 measured 766 MB for `/data/db`, `/data/configdb` and `/data/mongot`. With retention,
  steady state is a few GB on the 80 GB disk. 80% leaves ~16 GB free, roughly 20× the database
  footprint, which is days to weeks of headroom before `mongod` runs out of space.

### fail2ban — decision: not adopted

[S7](07-vps-mongodb-stack.md) left open whether to ban IPs on repeated MongoDB auth failures.

- **`mongod` cannot see client IPs.** Every connection arrives from nginx on 127.0.0.1, so its
  auth-failure log lines are all attributed to the proxy. fail2ban on them would ban nothing, or
  localhost.
- **Brute force is not a realistic threat.** Both app users have 48-character random passwords over
  SCRAM-SHA-256.
- **Connection floods are already bounded** by nginx `limit_conn mongo_per_ip 200`.
- An nginx-stream-log jail could only see TLS handshakes and connection counts, not SCRAM failures,
  so it would ban scanners that are already harmless.

Revisit if `mongod` ever gets PROXY protocol support behind nginx, or if scanning starts to cost
noticeable resources.

## Acceptance criteria

- [x] `db verify` runs on a schedule, after the nightly backup.
- [x] A non-zero exit produces an alert that reaches you, including the output.
- [x] Verified by deliberately introducing drift and confirming the alert fires.
- [x] Disk usage monitored on the data, mongot and backup volumes, with thresholds based on the S8
      footprint.
- [x] A backup retention policy is implemented and observed to prune.
- [x] The fail2ban question from S7 is decided and recorded.

## Verification

On the VPS, in the compose directory. Details in the [Runbook](#runbook).

```bash
# Drift alert fires
npx mongosh "$ORFARCHIV_DB_RW_URL" --quiet --eval 'db.getSiblingDB("orfarchiv").news.findOneAndDelete({}, { sort: { timestamp: -1 } })'
docker compose run --rm orfarchiv-db-verify verify --keep-running --cron "45 * * * * *"
# fails, retries 2 min later, fails again → Telegram alert with the counts; Ctrl-C
docker compose run --rm orfarchiv-db-backup sync --from <m0> --to <vps> --since <deleted story timestamp>
docker compose run --rm orfarchiv-db-verify verify; echo "exit=$?"       # zero

# Disk alert fires
docker compose run --rm orfarchiv-db-backup backup --target <vps> --disk-path /app/backup --disk-max-usage 1%

# Retention prunes
ls backup/*/                       # count stays at the policy limit after several nights
```

## Risks / open questions

- Alert fatigue: if transient drift alerts nightly, the alert stops being read. If the 2-minute retry
  is not enough, lengthen `RETRY_DELAY` or move the cron, rather than adding a count tolerance that
  would also hide real drift.
- **Dead-man's switch is missing.** A bug inside a run is caught, alerted as `… crashed` and the loop
  continues. What still goes unnoticed is the process itself disappearing: the container stopped or
  removed, the image failing to start, or the host down. `restart: unless-stopped` covers process
  exits; check `docker compose ps` occasionally, or add an external heartbeat later if this matters.
- The disk check runs only after the nightly backup. Something else filling the disk during the day is
  caught at the next 03:00 run at the latest.
- Mounting `orfarchiv-db` and `orfarchiv-db-mongot` into the backup container is read-only and only
  used for `statfs`, but it is still access to the data files. Accepted for the per-volume check.

## Runbook

Do the steps in order. `<compose-dir>` is the directory of the VPS compose file. As in
[S10](10-enable-dual-writes.md), secrets are read with `read -rs` (zsh) so none end up in the shell
history.

### 1. Telegram bot

1. In Telegram, message **@BotFather**, `/newbot`, and note the token.
2. Send any message to the new bot (or add it to a group and post there).
3. Get the chat ID:

   ```bash
   read -rs "ORFARCHIV_TELEGRAM_TOKEN?bot token: " && echo
   curl -s "https://api.telegram.org/bot${ORFARCHIV_TELEGRAM_TOKEN}/getUpdates" | jq '.result[].message.chat | {id, title, username}'
   ```

4. On **each** server that runs a `db` service, next to its compose file:

   ```bash
   printf '%s' "$ORFARCHIV_TELEGRAM_TOKEN" > secrets/orfarchiv_telegram_bot_token
   sudo chown 1000:1000 secrets/orfarchiv_telegram_bot_token
   sudo chmod 400 secrets/orfarchiv_telegram_bot_token
   ```

   Same ownership rule as S10: the image runs as `1000:1000`, a root-owned `600` file is unreadable.

### 2. Release

From the laptop, in `db`:

```bash
gh pr create --base main --head feat/self-hosted-db --title "feat: monitoring and backup retention"
# review, wait for CI, merge
gh run watch                                  # release + image jobs on main
git fetch --tags && git describe --tags --abbrev=0
```

### 3. Compose

On the VPS:

```bash
cd <compose-dir>
cp docker-compose.yml docker-compose.yml.pre-s12
```

Pin both `db` services to the version from step 2 and change them as follows. Keep everything the
backup service already has (secret, `./backup:/app/backup` mount, `restart`).

```yaml
services:
  orfarchiv-db-backup:
    image: ghcr.io/robin-w151/orfarchiv-db:<version>
    command:
      - backup
      - --keep-running
      - --keep-daily
      - '7'
      - --keep-monthly
      - '12'
      - --disk-path
      - /app/backup
      - --disk-path
      - /monitor/db
      - --disk-path
      - /monitor/mongot
    environment:
      ORFARCHIV_DB_URLS_FILE: /run/secrets/orfarchiv_db_urls
      ORFARCHIV_SERVER_LABEL: vps-fra
      ORFARCHIV_TELEGRAM_BOT_TOKEN_FILE: /run/secrets/orfarchiv_telegram_bot_token
      ORFARCHIV_TELEGRAM_CHAT_ID: '<chat id>'
    secrets:
      - orfarchiv_db_urls
      - orfarchiv_telegram_bot_token
    volumes:
      - ./backup:/app/backup
      - orfarchiv-db:/monitor/db:ro
      - orfarchiv-db-mongot:/monitor/mongot:ro
    restart: unless-stopped

  orfarchiv-db-verify:
    image: ghcr.io/robin-w151/orfarchiv-db:<version>
    command: ['verify', '--keep-running']
    environment:
      ORFARCHIV_DB_URLS_FILE: /run/secrets/orfarchiv_db_urls
      ORFARCHIV_SERVER_LABEL: vps-fra
      ORFARCHIV_TELEGRAM_BOT_TOKEN_FILE: /run/secrets/orfarchiv_telegram_bot_token
      ORFARCHIV_TELEGRAM_CHAT_ID: '<chat id>'
    secrets:
      - orfarchiv_db_urls
      - orfarchiv_telegram_bot_token
    restart: unless-stopped

secrets:
  orfarchiv_telegram_bot_token:
    file: ./secrets/orfarchiv_telegram_bot_token
```

Merge the top-level `secrets:` entry into the existing one. No `depends_on: orfarchiv-db` on either
service: verify must report an unreachable VPS, not wait for it.

**Second server's backup service:** same image version, same Telegram variables and secret, its own
`ORFARCHIV_SERVER_LABEL` (e.g. `backup-2`), the same retention flags, and only
`--disk-path /app/backup`, since it has no MongoDB volumes.

```bash
docker compose config -q
docker compose pull orfarchiv-db-backup orfarchiv-db-verify
docker compose up -d orfarchiv-db-backup orfarchiv-db-verify
docker compose ps orfarchiv-db-backup orfarchiv-db-verify       # both "Up"
docker compose logs --since 5m orfarchiv-db-backup orfarchiv-db-verify   # no help text; both log "Notifications via Telegram enabled."
```

### 4. Checks

**Notifier and disk alert**: a one-shot backup of the VPS target with a limit that is certainly
reached. This also prunes the backlog of that target right away.

```bash
docker compose run --rm orfarchiv-db-backup backup --target db1.orfarchiv.news:27017 \
  --keep-daily 7 --keep-monthly 12 \
  --disk-path /app/backup --disk-path /monitor/db --disk-path /monitor/mongot --disk-max-usage 1%
```

Expect `Disk usage …` lines that agree with `df -h` on the host (`df` rounds the use % up to a whole number, the log shows one decimal), `Pruned backup file …` lines, and a
`[vps-fra] 🟠 orfarchiv disk usage limit 1% reached` message in Telegram. Repeat on the second server
with only `--disk-path /app/backup`.

**Drift alert.** Delete the newest story on the VPS, then run `verify` on a per-minute cron at second 45:

```bash
read -rs "ORFARCHIV_DB_RW_PW?orfarchiv_rw password: " && echo
ORFARCHIV_DB_RW_URL="mongodb://orfarchiv_rw:${ORFARCHIV_DB_RW_PW}@db1.orfarchiv.news:27017/?tls=true&directConnection=true"
ORFARCHIV_DB_M0_LABEL=<cluster>.mongodb.net

npx mongosh "$ORFARCHIV_DB_RW_URL" --quiet --eval '
  printjson(db.getSiblingDB("orfarchiv").news.findOneAndDelete({}, { sort: { timestamp: -1 } }))'
# note the deleted story's timestamp

docker compose run --rm orfarchiv-db-verify verify --keep-running --cron "45 * * * * *"
```

Expect: verify fails, logs `Retrying in 2m...`, fails again, and Telegram receives
`[vps-fra] 🔴 orfarchiv verify failed` with both targets' counts and the failure summary. Ctrl-C.

The scraper may re-insert the story by itself if it is still in an RSS feed. If the retry passes, delete
an older story (sort `{ timestamp: 1 }`) instead.

Repair and confirm:

```bash
docker compose run --rm orfarchiv-db-backup sync \
  --from "$ORFARCHIV_DB_M0_LABEL" --to db1.orfarchiv.news:27017 --since <deleted story timestamp>
docker compose run --rm orfarchiv-db-verify verify; echo "exit=$?"     # mid-minute, exit 0
```

**Credential leak check:**

```bash
docker compose logs orfarchiv-db-backup orfarchiv-db-verify 2>&1 \
  | grep -cF -e "$ORFARCHIV_DB_RW_PW" -e "$ORFARCHIV_TELEGRAM_TOKEN"       # expect 0
```

### 5. Observe

Over the next nights:

```bash
docker compose logs --since 24h orfarchiv-db-backup | grep -E 'Pruned|Disk usage'
docker compose logs --since 24h orfarchiv-db-verify  | grep -E 'agree|failed'
ls backup/*/ | wc -l                                         # stops growing once the policy limit is reached
```

### 6. Rollback

`docker compose stop orfarchiv-db-verify`, and restore `docker-compose.yml.pre-s12` for the backup
service. Pruned backups do not come back, which is why the first prune is checked in step 4.

## Results

All runbook checks passed (2026-10-03):

- **Telegram:** both `--keep-running` services log `Notifications via Telegram enabled.`; alerts arrive
  with the server label prefix.
- **Disk alert:** a one-shot backup with `--disk-max-usage 1%` sent the `🟠` alert; usage lines agree
  with `df -h`.
- **Drift alert:** after deleting a story on the VPS, `verify` failed, retried after 2 minutes, failed
  again and the `🔴 verify failed` alert arrived with every target's counts. `sync --since` repaired
  it and `verify` exited 0.
- **Retention:** the first run with `--keep-daily 7 --keep-monthly 12` pruned the backlog.
- **Credentials:** no passwords or bot token in the service logs.

Code: `orfarchiv-db` PR [#139](https://github.com/Robin-w151/orfarchiv-db/pull/139) (notifier,
scheduled verify, retention, disk check, vitest setup with tests for the retention selection). Along
the way `effect` moved to rc.118 and `chai` was pinned to 6.2.2 to satisfy safe-chain's 48 h minimum
package age in CI.
