# 04: Deploy relay on VPS

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** 03
**Size:** M — DNS, certificate, compose entry, nginx vhost and a Vercel env var; touches live systems that already serve other traffic

## User story

As a user, I want the relay reachable at `wss://relay.orfarchiv.news/ws`, so that my devices can find each other.

## Description

The VPS, DNS and Vercel can only be reached by the maintainer. This story deploys the image from story 03 behind the existing host nginx with TLS, and tells the UI where the relay is.

### Runbook

`<vps>` is your SSH host alias, and `<compose-dir>` is the directory of the VPS compose file (the same as in epic 0001).

#### Prerequisites

- [ ] Story 03 is merged, and `ghcr.io/robin-w151/orfarchiv-relay:<VERSION>` exists (check the repo's `Packages` sidebar). `<VERSION>` is the version the release job published, e.g. `1.0.0`.
- [ ] The ghcr package is public: `https://github.com/users/Robin-w151/packages/container/orfarchiv-relay/settings` → `Change visibility` → Public. Otherwise the VPS needs `docker login ghcr.io`, the same as for the scraper image.
- [ ] SSH + sudo on `<vps>`. Access to the DNS provider for `orfarchiv.news` and to the Vercel project.
- [ ] Hostname: `relay.orfarchiv.news` (decided).

#### Steps

1. **DNS record**
   At the DNS provider, create an `A` record `relay.orfarchiv.news` → VPS IPv4. Add `AAAA` → VPS IPv6 only if IPv6 works on the VPS. TTL 300. If the provider is Cloudflare, either set the record to DNS only, or enable WebSockets if it is proxied.

   ```sh
   dig +short A relay.orfarchiv.news   # from your laptop
   ssh <vps> curl -4 -s ifconfig.me     # must match
   ```

   **Expected:** both print the same IP.

2. **Compose entry**
   On the VPS, add this to the existing compose file in `<compose-dir>`:

   ```yaml
   orfarchiv-relay:
     image: ghcr.io/robin-w151/orfarchiv-relay:<VERSION>
     restart: unless-stopped
     read_only: true
     tmpfs: [/tmp]
     environment:
       PORT: 8080
       RELAY_MAX_CONNECTIONS: 2000
       RELAY_ALLOWED_ORIGINS: https://orfarchiv.news,https://develop.orfarchiv.news,https://orfarchiv-*-robins-projects-bb10f956.vercel.app
     ports:
       - 127.0.0.1:8090:8080
     logging:
       driver: json-file
       options: { max-size: 10m, max-file: "3" }
   ```

   - Port `8090` on the host is a suggestion. First check that it's free: `ss -tlnp | grep 8090` should print nothing.

   ```sh
   cd <compose-dir>
   docker compose up -d orfarchiv-relay
   curl -s 127.0.0.1:8090/health
   ```

   **Expected:** `{"status":"ok","rooms":0,"connections":0}`.

3. **Certificate**

   ```sh
   sudo certbot certonly --nginx -d relay.orfarchiv.news
   ```

   **Expected:** `Successfully received certificate`. The deploy hook `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` from epic 0001 story 07 already reloads nginx on renewal.

4. **nginx http server**
   Create `/etc/nginx/sites-available/relay.orfarchiv.news`. This is the `http {}` context, **not** the `stream {}` block used for MongoDB. The VPS uses `sites-available` / `sites-enabled`.

   ```nginx
   limit_conn_zone $binary_remote_addr zone=relay_per_ip:10m;

   map $http_upgrade $connection_upgrade {
       default upgrade;
       ''      close;
   }

   server {
       listen 443 ssl;
       listen [::]:443 ssl;
       http2 off;
       server_name relay.orfarchiv.news;

       ssl_certificate     /etc/letsencrypt/live/relay.orfarchiv.news/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/relay.orfarchiv.news/privkey.pem;
       ssl_protocols       TLSv1.2 TLSv1.3;

       access_log off;
       limit_conn relay_per_ip 20;

       location = /health { proxy_pass http://127.0.0.1:8090; }

       location = /ws {
           proxy_pass http://127.0.0.1:8090;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection $connection_upgrade;
           proxy_set_header Origin $http_origin;
           proxy_read_timeout 120s;
           proxy_send_timeout 120s;
       }

       location / { return 404; }
   }
   ```

   - `access_log off` keeps client IPs and paths out of the logs, in line with the "stores nothing" goal.
   - If a `map $http_upgrade $connection_upgrade` already exists in another site, remove the copy here. A duplicate `map` makes `nginx -t` fail.

   ```sh
   sudo ln -s /etc/nginx/sites-available/relay.orfarchiv.news /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

   **Expected:** `syntax is ok` / `test is successful`, and no error from reload.

5. **Set the UI env variable on Vercel**
   Vercel → project `orfarchiv` → `Settings → Environment Variables → Add`:
   - Key `PUBLIC_SYNC_RELAY_URL`, value `wss://relay.orfarchiv.news/ws`, environments **Production, Preview, Development**.
     Docs: https://vercel.com/docs/projects/environment-variables
     **Expected:** the variable is listed. It takes effect on the next deployment. Story 10's preview deployments are the first to use it, and its e2e tests require it.

#### Verify

```sh
curl -s https://relay.orfarchiv.news/health
npx --yes wscat@6 -c wss://relay.orfarchiv.news/ws -H "Origin: https://orfarchiv.news"
# then type: {"type":"join","room":"0000000000000000000000000000000000000000000000000000000000000000","peerId":"manual-test-peer-0001","version":1}
npx --yes wscat@6 -c wss://relay.orfarchiv.news/ws -H "Origin: https://evil.example"
```

**Expected:** `/health` returns `status ok`. The first `wscat` gets `{"type":"peers","peers":[]}`. The second connection is refused (403). `/` returns 404.

Note: run `npx` directly, not through `timeout`/`env`, so the safe-chain wrapper still applies.

#### Rollback

- Remove the vhost: `sudo rm /etc/nginx/sites-enabled/relay.orfarchiv.news && sudo nginx -t && sudo systemctl reload nginx`.
- `docker compose rm -sf orfarchiv-relay`, and remove the entry from the compose file.
- Delete `PUBLIC_SYNC_RELAY_URL` on Vercel. The UI then hides the sync section.
- No other service is affected. MongoDB uses the separate `stream` block.

#### Hand back to Claude

- The final relay URL (e.g. `wss://relay.orfarchiv.news/ws`) for local `.env` docs and e2e config.
- Confirmation that a preview deployment URL matches the `RELAY_ALLOWED_ORIGINS` pattern. Copy one preview URL from Vercel and compare it to the pattern.
- No secrets are involved.

#### Troubleshooting

- **The WebSocket closes immediately with 400** → `Upgrade`/`Connection` headers aren't passed. Check the `/ws` location and `proxy_http_version 1.1`.
- **`duplicate "map"` or `limit_conn_zone` errors in `nginx -t`** → the name already exists in another file. Reuse it or rename it.
- **Connections drop after about 60 s** → the proxy timeout is shorter than the relay's 30 s ping interval allows. Keep `proxy_read_timeout` ≥ 60 s.
- **certbot fails the HTTP-01 challenge** → DNS hasn't propagated yet, or the AAAA record points to a dead IPv6 address.

## Acceptance criteria

- [ ] Given the deployment, when calling `https://relay.orfarchiv.news/health`, then it returns 200 with `status: ok`.
- [ ] Given a WebSocket from origin `https://orfarchiv.news`, when it sends a valid `join`, then it gets a `peers` message.
- [ ] Given another origin, then the upgrade is refused.
- [ ] Given the VPS, when running `ss -tlnp`, then the relay container listens only on `127.0.0.1`.
- [ ] `PUBLIC_SYNC_RELAY_URL` is set on Vercel for all environments.

## Technical notes

- The image and env variables are defined in story 03 ([relay/README.md](../../../relay/README.md) once written).
- nginx/certbot conventions follow [epic 0001 story 07](../0001-self-hosted-db/07-vps-mongodb-stack.md).
- The UI reads `PUBLIC_SYNC_RELAY_URL` via `$app/env/public` (story 07), and the CSP `connect-src` is built from it.

## Out of scope

- The STUN server (story 05). No TURN server is planned.
- The UI deployment and release (story 12).
