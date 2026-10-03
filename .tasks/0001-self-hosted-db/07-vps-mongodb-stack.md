# S7 — VPS production MongoDB stack

**Owner:** Both (I write the templates, you deploy)   **Repo:** infra   **Size:** L
**Depends on:** [S0](00-spike-atlas-local-auth.md)   **Blocks:** [S8](08-seed-and-parity.md)
**Status:** ✅ Done (2026-09-26) — deployed at `db1.orfarchiv.news:27017`, all verification checks passed

## Goal

Stand up `mongodb/mongodb-atlas-local` on the Frankfurt VPS, reachable from Vercel over TLS with
SCRAM authentication at `db1.orfarchiv.news:27017`, alongside the scraper and backup containers already
running there.

## Why

This is the self-hosted database itself. Everything on the infra track leads here, and
[S8](08-seed-and-parity.md) cannot start without it.

The UI stays on Vercel, and Vercel has no static egress IPs to allowlist outside Enterprise Secure
Compute — so the database has to be internet-facing. TLS + SCRAM-SHA-256 is precisely what Atlas
itself exposes, so this is a normal posture rather than an unusual risk, but it has to be done
properly.

## Scope

**In scope**

- Compose entry for atlas-local, added to the existing VPS compose file.
- TLS termination on the host's existing nginx (`stream`) with a certbot certificate.
- DNS, firewall.
- Authentication and least-privilege users.
- Making sure no `mongo-express` is exposed on the VPS (it only exists in the dev `db/docker-compose.yml`).

**Out of scope**

- Loading data ([S8](08-seed-and-parity.md)).
- Monitoring and scheduled verification ([S12](12-monitoring-and-scheduled-verify.md)).
- Pointing any traffic at it ([S10](10-enable-dual-writes.md), [S11](11-point-ui-reads-at-vps.md)).

## Technical notes

### Topology

```text
Vercel / laptop ──TLS──▶ host nginx stream :27017 (public, LE cert for db1.orfarchiv.news)
                              │ plaintext, loopback
                              ▼
                         127.0.0.1:27018 ──▶ orfarchiv-db container :27017 (mongod + mongot)
```

The VPS already runs nginx (with the `stream` module enabled for another service) and certbot on the
host, so both are reused rather than adding proxy and certbot containers.

### Services

| Service | Notes |
| --- | --- |
| `orfarchiv-db` *(new)* | `mongodb/mongodb-atlas-local:8.3.3@sha256:03256817c492ad78873c3727435c1f164c705e541d150322b47700217db5a7f9`, **pinned by tag and digest** (validated in S0). Published **only on `127.0.0.1:27018`**. Fixed `hostname`. Volumes `/data/db`, `/data/configdb` and `/data/mongot`. WiredTiger cache left at the image default (~3 GB on this VPS) |
| host nginx *(existing)* | New `server` in the existing `stream {}` block: TLS on public `27017` → `127.0.0.1:27018`. `limit_conn`, `ssl_session_cache` + session tickets so warm Vercel instances resume rather than doing a full handshake. Reloads gracefully on cert rotation |
| host certbot *(existing)* | New certificate for `db1.orfarchiv.news`, with a deploy hook that reloads nginx |
| `orfarchiv-scraper` | Existing; unchanged here. Env swaps to `ORFARCHIV_DB_URLS` at [S10](10-enable-dual-writes.md) |
| `orfarchiv-db-backup` | Existing; unchanged here |
| `mongo-express` | **Not deployed on the VPS.** It only exists in the dev `db/docker-compose.yml`, which stays as is. Use mongosh or Compass over an SSH tunnel instead |

### Findings from the local atlas-local 8.3.3

- **`directConnection=true` is required.** atlas-local is a single-node replica set whose member host is the
  container hostname (e.g. `30a064dab603:27017`). Without `directConnection=true`, a driver connecting
  through the proxy follows the replica-set host list to that unresolvable name and fails. Every URL in
  this story carries it. The compose entry sets `hostname: orfarchiv-db` so the name at least stays stable.
- **`/data/configdb` must be persisted.** mongod runs with `keyFile: /data/configdb/keyfile`, which is
  what mongod and mongot authenticate each other with.
- **WiredTiger cache is not set by the image.** It defaults to ~50% of (RAM − 1 GB). The image does not
  document how it passes extra mongod arguments, so the deployed entry leaves it at the default, ~3 GB on this VPS.
  That is fine: WiredTiger only caches data that is actually read, and the dataset is 300–500 MB.
- **Root credentials support `_FILE`.** `MONGODB_INITDB_ROOT_USERNAME_FILE` / `_PASSWORD_FILE` are
  supported, so root uses Docker secrets.
- **Docker-published ports bypass UFW.** A `27017:27017` publish would be reachable regardless of firewall
  rules, which is why the container binds loopback only and host nginx is the sole public listener.

### Sizing

The dataset is ~436,710 documents, 300–500 MB with indexes. Vector data is 256-dim quantized, so
roughly 110 MB raw plus HNSW graph overhead in `mongot`. Everything fits comfortably in 8 GB with the
default ~3 GB WiredTiger cache, which the data never fills; disk use is a small fraction of the 80 GB.

### Authentication

Root comes from `MONGODB_INITDB_ROOT_USERNAME_FILE` / `MONGODB_INITDB_ROOT_PASSWORD_FILE`, then
least-privilege users are created:

| User | Role | Used by |
| --- | --- | --- |
| `orfarchiv_rw` | `readWrite` on `orfarchiv` | scraper, `db sync`, `db setup` |
| `orfarchiv_ro` | `read` on `orfarchiv` | ui, `db backup`, `db verify` |

**Validated in [S0](00-spike-atlas-local-auth.md):** `$vectorSearch` works with SCRAM enabled, for both
users. The mTLS fallback is not needed. Findings that shape this story:

- The root credentials are only applied when `/data/db` is empty. Changing them later has no effect;
  rotate with `db.changeUserPassword` instead.
- The image creates root only. App users need an explicit provisioning step after first start:
  [scripts/create-users.js](scripts/create-users.js) (idempotent, so it also rotates passwords).
- Users live in `admin`. Connection strings without a database path need no `authSource`:
  `mongodb://orfarchiv_ro:<pw>@db1.orfarchiv.news:27017/?tls=true&directConnection=true`.
- `db setup` runs fine as `orfarchiv_rw` (collection, indexes, search index), so root is only needed for
  user management.
- `$vectorSearch` needs only `read`; `orfarchiv_ro` is denied every write and admin action.

### Firewall

`27017/tcp` must be open to the world — there are no Vercel egress IPs to allowlist. Apart from what the
VPS already serves (SSH, 80/443), everything else stays closed. Use long generated passwords and rotate
them if they ever transit an insecure channel.

### Depends-on caveat

`depends_on: condition: service_healthy` needs a healthcheck; the atlas-local image supplies its own
`HEALTHCHECK`. S0 confirmed it still reports healthy with auth enabled.

### Image updates

Docker Hub rebuilds and re-pushes every atlas-local tag, including exact patch tags, with new digests
roughly weekly. The tag is only a label; the digest is what gets pulled. When bumping the digest (e.g.
via Renovate), re-run `seed.js` + `perm-test.js` from S0 against a local stack on the new digest before
deploying it.

## Deployment runbook

Do the steps in order. `<vps>` is your SSH host alias.

### 1. DNS record for `db1.orfarchiv.news` — do this first

Certbot and every later step depend on it.

- Create an **`A`** record `db1.orfarchiv.news` → the VPS IPv4.
- Create an **`AAAA`** record → the VPS IPv6 **only if the VPS has working IPv6**. A stale AAAA makes
  Let's Encrypt validate over a dead path.
- **DNS only, no CDN proxying** (e.g. Cloudflare's orange cloud off). A proxied record cannot carry raw TCP
  on 27017.
- Use TTL 300 while setting up.

Before continuing, check from a machine that is **not** the VPS:

```bash
dig +short A db1.orfarchiv.news        # must equal `curl -4 -s ifconfig.me` run on the VPS
dig +short AAAA db1.orfarchiv.news     # empty, or equal to `curl -6 -s ifconfig.me` on the VPS
```

### 2. Compose entries

Next to the existing compose file, create the root secrets (not committed anywhere):

```bash
mkdir -p secrets && chmod 700 secrets
printf 'orfarchiv_root' > secrets/orfarchiv_db_root_username
openssl rand -base64 36 | tr -d '/+=\n' > secrets/orfarchiv_db_root_password
chmod 600 secrets/*
```

Add to the existing compose file:

```yaml
services:
  orfarchiv-db:
    image: mongodb/mongodb-atlas-local:8.3.3@sha256:03256817c492ad78873c3727435c1f164c705e541d150322b47700217db5a7f9
    hostname: orfarchiv-db
    environment:
      MONGODB_INITDB_ROOT_USERNAME_FILE: /run/secrets/orfarchiv_db_root_username
      MONGODB_INITDB_ROOT_PASSWORD_FILE: /run/secrets/orfarchiv_db_root_password
      DO_NOT_TRACK: '1'
    secrets:
      - orfarchiv_db_root_username
      - orfarchiv_db_root_password
    ports:
      - '127.0.0.1:27018:27017'
    networks:
      - orfarchiv-db-network
    volumes:
      - orfarchiv-db:/data/db
      - orfarchiv-db-config:/data/configdb
      - orfarchiv-db-mongot:/data/mongot
    restart: unless-stopped

networks:
  orfarchiv-db-network:

volumes:
  orfarchiv-db:
  orfarchiv-db-config:
  orfarchiv-db-mongot:

secrets:
  orfarchiv_db_root_username:
    file: ./secrets/orfarchiv_db_root_username
  orfarchiv_db_root_password:
    file: ./secrets/orfarchiv_db_root_password
```

Merge the top-level `networks` / `volumes` / `secrets` keys into the ones you already have. If the network
already exists under another name, use that one.

Then:

```bash
docker compose up -d --remove-orphans
docker compose ps orfarchiv-db            # wait for "healthy"
```

**Check the cache size** as root (via the tunnel from step 4). `serverStatus` needs `clusterMonitor`, which
the app users don't have:

```js
db.serverStatus().wiredTiger.cache['maximum bytes configured'] / 2 ** 30   // ~3 on this VPS
```

The default is fine for this dataset. To cap it later, add `mem_limit:` to the service; mongod sizes its
cache from the cgroup limit as (limit − 1 GB) / 2.

Later, at [S10](10-enable-dual-writes.md): containers on `orfarchiv-db-network` (scraper, backup) can use
the internal URL `mongodb://<user>:<pw>@orfarchiv-db:27017/?directConnection=true`, without TLS and without
going through nginx. Nothing changes for them now.

### 3. Volumes are on the large disk

```bash
docker info -f '{{.DockerRootDir}}'       # usually /var/lib/docker
df -h "$(docker info -f '{{.DockerRootDir}}')"   # must be the 80 GB filesystem
```

### 4. Provision the app users (root never leaves loopback)

Open an SSH tunnel from your machine to the loopback port, so the scripts in this repo can be run locally:

```bash
ssh -N -L 27018:127.0.0.1:27018 <vps>
```

In a second terminal:

```bash
export ORFARCHIV_RW_PASSWORD="$(openssl rand -base64 36 | tr -d '/+=\n')"
export ORFARCHIV_RO_PASSWORD="$(openssl rand -base64 36 | tr -d '/+=\n')"
# store both in your password manager now

ROOT_PW="$(ssh <vps> cat <compose-dir>/secrets/orfarchiv_db_root_password)"
npx mongosh "mongodb://orfarchiv_root:${ROOT_PW}@127.0.0.1:27018/?directConnection=true" \
  --file .tasks/self-hosted-db/scripts/create-users.js
```

Expect `created orfarchiv_rw (readWrite@orfarchiv)` and `created orfarchiv_ro (read@orfarchiv)`.

### 5. Certificate for `db1.orfarchiv.news`

On the VPS (DNS from step 1 must resolve):

```bash
sudo certbot certonly --nginx -d db1.orfarchiv.news
```

Add a deploy hook so nginx picks up renewed certs. `reload` is graceful: old workers keep serving the open
streams until they close, so renewal does not drop connections.

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null <<'EOF'
#!/bin/sh
nginx -t && systemctl reload nginx
EOF
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

`certbot.timer` runs twice a day at randomised times, and a reload doesn't interrupt anything, so it does
not need to be moved away from the 03:00 backup.

### 6. nginx stream server

The `stream {}` block already exists. Add the following **inside it**, or in the file it includes. A second
top-level `stream {}` fails with a duplicate-directive error. First check that nothing in the existing
stream config listens on 27017 or already uses these zone/upstream names.

```nginx
limit_conn_zone $binary_remote_addr zone=mongo_per_ip:10m;

upstream orfarchiv_db {
    server 127.0.0.1:27018;
}

server {
    listen 27017 ssl;
    listen [::]:27017 ssl;

    ssl_certificate     /etc/letsencrypt/live/db1.orfarchiv.news/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/db1.orfarchiv.news/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    ssl_session_cache   shared:MONGO_SSL:10m;
    ssl_session_timeout 4h;
    ssl_session_tickets on;

    limit_conn mongo_per_ip 200;

    proxy_pass            orfarchiv_db;
    proxy_connect_timeout 5s;
    proxy_timeout         1h;
}
```

- `limit_conn 200` is deliberately generous. Vercel functions share egress IPs, and each instance's driver
  pool can open up to 100 connections.
- `proxy_timeout 1h` closes connections that have been idle for an hour. Driver monitoring connections
  heartbeat every 10 s, so only idle pooled connections are affected. The UI should set `maxIdleTimeMS`
  below 1 h ([S6](06-ui-database-service.md) / [S11](11-point-ui-reads-at-vps.md)).
- Session resumption only helps a warm Vercel instance that reconnects. A cold start is a new process
  with no cached session or ticket.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 7. Firewall

```bash
sudo ufw allow 27017/tcp
sudo ufw status                           # 22, 80, 443 (existing) + 27017 — nothing else
sudo ss -tlnp | grep -E ':(27017|27018|3002)\b'
# expect: nginx on 0.0.0.0:27017 / [::]:27017, docker-proxy on 127.0.0.1:27018 only, nothing on 3002
```

If the provider also has a cloud firewall in front of the VPS, open 27017/tcp there too.

## Acceptance criteria

- [x] `db1.orfarchiv.news` resolves (A, and AAAA if used) to the VPS, DNS-only.
- [x] `mongosh "mongodb://orfarchiv_ro:<pw>@db1.orfarchiv.news:27017/?tls=true&directConnection=true"`
      connects **from off the VPS**.
- [x] `orfarchiv_rw` and `orfarchiv_ro` provisioned via `create-users.js`; `perm-test.js` passes 16/16 for
      both over TLS through nginx.
- [x] The same connection **fails** without credentials, and fails without TLS.
- [x] `mongod` is not reachable directly on any public port — only nginx's 27017. `27018` is bound to
      loopback only.
- [x] No `mongo-express` on the VPS; nothing listens on 3002.
- [x] The certificate auto-renews and nginx reloads without dropping the service
      (`certbot renew --dry-run` with deploy hooks).
- [x] `ssl_session_cache` is enabled and session resumption is observable.
- [x] WiredTiger cache is bounded (image default, ~3 GB; the data never fills it).
- [x] Volumes (`/data/db`, `/data/configdb`, `/data/mongot`) are on the large disk and survive
      `docker compose down && up`.
- [x] The image is pinned by digest, matching the one validated in S0.
- [x] Secrets are not committed. Root uses `_FILE` Docker secrets; app passwords live in the password
      manager.

## Verification

Run from a machine that is **not** the VPS unless noted. `RO` / `RW` are the app passwords.

```bash
H=db1.orfarchiv.news
RO_URL="mongodb://orfarchiv_ro:${RO}@${H}:27017/?tls=true&directConnection=true"
RW_URL="mongodb://orfarchiv_rw:${RW}@${H}:27017/?tls=true&directConnection=true"

# DNS
dig +short A $H; dig +short AAAA $H

# Positive
npx mongosh "$RO_URL" --eval 'db.runCommand({ ping: 1 })'

# Negative: all must fail
npx mongosh "mongodb://${H}:27017/?tls=true&directConnection=true" \
  --eval 'db.getSiblingDB("orfarchiv").news.findOne()'                                   # no creds → Unauthorized
npx mongosh "mongodb://orfarchiv_ro:${RO}@${H}:27017/?directConnection=true&serverSelectionTimeoutMS=5000" \
  --eval 'db.runCommand({ ping: 1 })'                                                    # no TLS
nc -zv -w 5 $H 27018                                                                     # mongod direct
curl -m 5 http://$H:3002                                                                 # mongo-express

# Least privilege over TLS (before S8: setup + synthetic docs as orfarchiv_rw)
(cd db && ORFARCHIV_DB_URLS="$RW_URL" npm start -- setup)   # URLS, not URL: db/.env* sets URLS, which wins
npx mongosh "$RW_URL" --file .tasks/self-hosted-db/scripts/seed.js
npx mongosh "$RO_URL" --file .tasks/self-hosted-db/scripts/perm-test.js                  # 16/16
npx mongosh "$RW_URL" --file .tasks/self-hosted-db/scripts/perm-test.js                  # 16/16

# Persistence (on the VPS), while the synthetic docs still exist
docker compose down && docker compose up -d && docker compose ps orfarchiv-db            # healthy
npx mongosh "$RO_URL" --eval 'const o = db.getSiblingDB("orfarchiv");
  printjson({ count: o.news.countDocuments(), idx: o.news.getSearchIndexes().map((i) => [i.name, i.status]) })'
# expect count 30 and news_title_vector READY, same as before the restart

# Clean up the synthetic data
npx mongosh "$RW_URL" --eval 'const o = db.getSiblingDB("orfarchiv");
  o.news.deleteMany({ id: /^spike:/ });
  o.getCollectionNames().filter((n) => n.startsWith("permtest")).forEach((n) => o[n].drop())'

# TLS session resumption: expect one "New" then "Reused" lines
openssl s_client -connect $H:27017 -servername $H -tls1_2 -reconnect </dev/null 2>/dev/null | grep -E '^(New|Reused)'

# Cache size: as root via the SSH tunnel from step 4 (the app users lack clusterMonitor)
npx mongosh "mongodb://orfarchiv_root:${ROOT_PW}@127.0.0.1:27018/?directConnection=true" \
  --eval 'db.serverStatus().wiredTiger.cache["maximum bytes configured"] / 2 ** 30'   # ~3

# Renewal (on the VPS). If your certbot lacks --run-deploy-hooks, run the hook script by hand
sudo certbot renew --dry-run --cert-name db1.orfarchiv.news --run-deploy-hooks

# Digest (on the VPS): must be sha256:03256817c492…
docker inspect --format '{{index .RepoDigests 0}}' "$(docker compose images -q orfarchiv-db)"
```

## Risks / open questions

- An internet-facing MongoDB attracts background scanning. Consider `limit_conn` tuning and whether
  fail2ban on repeated auth failures is worth adding; capture the decision in
  [S12](12-monitoring-and-scheduled-verify.md).
- Certificate renewal triggers `systemctl reload nginx`. The reload is graceful, and the UI's failover
  ([S6](06-ui-database-service.md)) covers any hiccup. Verify once that a live mongosh session survives
  a reload.
- Any tag on the atlas-local image is a moving target (see [Image updates](#image-updates)); pinning the
  digest is what makes S0's result meaningful over time.
- `8.3.3` is not the newest 8.3 patch (`8.3.8` exists). Fine to deploy as validated, but plan a
  re-validated bump rather than drifting.
- The WiredTiger cache is uncapped (default ~3 GB). Watch host memory in
  [S12](12-monitoring-and-scheduled-verify.md) and add `mem_limit:` if mongod, mongot, the scraper and the
  backup ever compete for RAM.
