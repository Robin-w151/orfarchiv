# S7 — VPS production MongoDB stack

**Owner:** Both (I write the templates, you deploy)   **Repo:** infra   **Size:** L
**Depends on:** [S0](00-spike-atlas-local-auth.md)   **Blocks:** [S8](08-seed-and-parity.md)

## Goal

Stand up `mongodb/mongodb-atlas-local` on the Frankfurt VPS, reachable from Vercel over TLS with
SCRAM authentication, alongside the scraper and backup containers already running there.

## Why

This is the self-hosted database itself. Everything on the infra track leads here, and
[S8](08-seed-and-parity.md) cannot start without it.

The UI stays on Vercel, and Vercel has no static egress IPs to allowlist outside Enterprise Secure
Compute — so the database has to be internet-facing. TLS + SCRAM-SHA-256 is precisely what Atlas
itself exposes, so this is a normal posture rather than an unusual risk, but it has to be done
properly.

## Scope

**In scope**

- Compose stack: atlas-local, TLS proxy, certbot, plus the existing scraper and backup services.
- DNS, certificates, firewall.
- Authentication and least-privilege users.
- Securing the currently-exposed `mongo-express`.

**Out of scope**

- Loading data ([S8](08-seed-and-parity.md)).
- Monitoring and scheduled verification ([S12](12-monitoring-and-scheduled-verify.md)).
- Pointing any traffic at it ([S10](10-enable-dual-writes.md), [S11](11-point-ui-reads-at-vps.md)).

## Technical notes

### Services

| Service | Notes |
| --- | --- |
| `orfarchiv-db` | `mongodb/mongodb-atlas-local`, **pinned by digest** (the one validated in S0). **Remove the `27017:27017` host publish** — internal network only. Volumes `/data/db` and `/data/mongot` on the 80 GB disk. Set `--wiredTigerCacheSizeGB 2.5` to leave headroom for `mongot` |
| `mongo-tls-proxy` *(new)* | nginx with the `stream` module (or HAProxy) terminating TLS on public `27017` → `orfarchiv-db:27017`. Keeps TLS out of the atlas-local image entirely, which is far easier than configuring `mongod` TLS through it, and survives cert rotation with a reload. Add `limit_conn`, and **enable `ssl_session_cache` + session tickets** so Vercel cold starts resume rather than doing a full handshake |
| `certbot` *(new)* | Let's Encrypt for the DB hostname, with a proxy-reload deploy hook |
| `orfarchiv-scraper` | Existing image; env swaps to `ORFARCHIV_DB_URLS` at [S10](10-enable-dual-writes.md) |
| `orfarchiv-db-backup` | Existing image; named volume for `.backup` |
| `mongo-express` | **Security fix: currently published as `3002:8081` on all interfaces with no auth.** Bind to `127.0.0.1:3002` and reach it over an SSH tunnel, or drop it entirely |

### Sizing

The dataset is ~436,710 documents, 300–500 MB with indexes. Vector data is 256-dim quantized, so
roughly 110 MB raw plus HNSW graph overhead in `mongot`. Everything fits comfortably in 8 GB with the
2.5 GB WiredTiger cache above; disk use is a small fraction of the 80 GB.

### Authentication

Enable `MONGODB_INITDB_ROOT_USERNAME` / `MONGODB_INITDB_ROOT_PASSWORD`, then create least-privilege
users:

| User | Role | Used by |
| --- | --- | --- |
| app-write | `readWrite` on `orfarchiv` | scraper, `db sync`, `db setup` |
| app-read | `read` on `orfarchiv` | ui, `db backup`, `db verify` |

`$vectorSearch` needs only read privileges.

**Gated on [S0](00-spike-atlas-local-auth.md).** If that spike found that `mongot` does not serve
`$vectorSearch` with SCRAM enabled, the design changes to mTLS at the nginx stream layer with
`mongod` unauthenticated behind it — noticeably worse, because the Vercel side must then write a
client PEM to `/tmp` at cold start. Do not start this story until S0 has answered.

### Firewall

`27017/tcp` must be open to the world — there are no Vercel egress IPs to allowlist. Everything else
closed. Use a long generated password and rotate it if it ever transits an insecure channel.

### Depends-on caveat

`depends_on: condition: service_healthy` needs a healthcheck; the atlas-local image supplies its own
`HEALTHCHECK`. Confirm it still reports healthy with auth enabled (part of S0).

## Acceptance criteria

- [ ] `mongosh "mongodb://app-read:<pw>@<host>:27017/?tls=true"` connects **from off the VPS**.
- [ ] The same connection **fails** without credentials, and fails without TLS.
- [ ] `mongod` is not reachable directly on any public port — only the proxy's 27017.
- [ ] `mongo-express` is not reachable from the internet.
- [ ] Certificate auto-renews and the proxy reloads without dropping the service (test with
      `certbot renew --dry-run`).
- [ ] `ssl_session_cache` is enabled and session resumption is observable.
- [ ] Volumes are on the large disk and survive `docker compose down && up`.
- [ ] The image is pinned by digest, matching the one validated in S0.
- [ ] Secrets are not committed — `_FILE` Docker secrets or an untracked env file.

## Verification

```bash
# From a machine that is NOT the VPS:
mongosh "mongodb://app-read:<pw>@<host>:27017/?tls=true" --eval 'db.runCommand({ ping: 1 })'

# Negative checks — all three must fail
mongosh "mongodb://<host>:27017/?tls=true" --eval 'db.runCommand({ ping: 1 })'   # no creds
mongosh "mongodb://app-read:<pw>@<host>:27017/"                                  # no TLS
curl -m 5 http://<host>:3002                                                     # mongo-express

# Least privilege: app-read must not be able to write
mongosh "mongodb://app-read:<pw>@<host>:27017/?tls=true" \
  --eval 'db.getSiblingDB("orfarchiv").news.insertOne({ x: 1 })'   # expect auth error

# TLS session resumption
openssl s_client -connect <host>:27017 -reconnect 2>&1 | grep -i 'reused\|session'

# Renewal
certbot renew --dry-run
```

## Risks / open questions

- An internet-facing MongoDB attracts background scanning. Consider `limit_conn` tuning and whether
  fail2ban on repeated auth failures is worth adding; capture the decision in
  [S12](12-monitoring-and-scheduled-verify.md).
- Certificate renewal restarting the proxy briefly drops connections. The driver reconnects, and the
  UI's failover ([S6](06-ui-database-service.md)) covers the window — but schedule renewal away from
  the 03:00 backup window.
- `latest` on the atlas-local image is a moving target; pinning the digest is what makes S0's result
  meaningful over time.
