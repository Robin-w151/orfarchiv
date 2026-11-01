# 05: Deploy STUN server

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** 04
**Size:** S — one container, one firewall rule and one Vercel env var; the hostname and DNS already exist from story 04

## User story

As a user, I want my devices to find a direct connection through a STUN server run by ORF Archiv itself, so that no third party sees my IP address when I sync.

## Description

WebRTC needs a STUN server so each device can find its public address. Running coturn in **STUN-only** mode on the VPS keeps that inside the project. It answers address lookups and nothing else: no TURN relaying, no authentication, no storage. This has to be done manually because it touches the VPS firewall and Vercel.

The server reuses the hostname `relay.orfarchiv.news` from story 04 on port `3478`, so no new DNS record or certificate is needed. STUN over UDP doesn't use TLS.

### Runbook

`<vps>` is your SSH host alias, and `<compose-dir>` is the directory of the VPS compose file.

#### Prerequisites

- [ ] Story 04 is done: `relay.orfarchiv.news` resolves to the VPS.
- [ ] SSH + sudo on `<vps>`, access to the Vercel project.
- [ ] Pick the coturn image version, the same way the MongoDB image was pinned in epic 0001:
  1. Open https://hub.docker.com/r/coturn/coturn/tags and choose the newest plain version tag (e.g. `4.7.0`; not `latest`, not `-alpine`/`-debian` variants unless you prefer them) that was pushed at least 48 h ago. That is `<COTURN_TAG>`.
  2. Read its digest, the fingerprint of the exact image content:
     ```sh
     docker buildx imagetools inspect coturn/coturn:<COTURN_TAG> | grep -m1 Digest
     ```
     The `sha256:…` value is `<COTURN_DIGEST>`. With `image: coturn/coturn:<COTURN_TAG>@<COTURN_DIGEST>`, Docker pulls exactly that image even if the tag is later re-pushed, and the tag remains as a readable label.

#### Steps

1. **Check that port 3478 is free**

   ```sh
   ssh <vps> "sudo ss -ulnpt | grep ':3478\b'"
   ```

   **Expected:** no output.

2. **Compose entry**
   Add to the existing compose file in `<compose-dir>`:

   ```yaml
   orfarchiv-stun:
     image: coturn/coturn:<COTURN_TAG>@<COTURN_DIGEST>
     restart: unless-stopped
     network_mode: host
     read_only: true
     tmpfs: [/var/tmp, /var/lib/coturn]
     command:
       - --stun-only
       - --listening-port=3478
       - --no-tls
       - --no-dtls
       - --no-cli
       - --no-software-attribute
       - --no-multicast-peers
       - --fingerprint
       - --no-stdout-log
       - --log-file=/dev/null
   ```

   - `network_mode: host`: coturn must see each client's real source address. With Docker port mapping, IPv6 and some UDP paths go through docker-proxy, which hides that address and returns wrong results.
   - Logging off: the STUN server would otherwise log client IP addresses.
   - Check each flag against `docker run --rm coturn/coturn:<COTURN_TAG> --help` for the chosen version. If a flag doesn't exist (renamed between versions), drop it and note this in the story.

   ```sh
   cd <compose-dir>
   docker compose up -d orfarchiv-stun
   docker compose ps orfarchiv-stun
   sudo ss -ulnp | grep ':3478\b'
   ```

   **Expected:** the container is `running`, and `turnserver` listens on UDP `0.0.0.0:3478` (and `[::]:3478` if IPv6 is used).

3. **Firewall**

   coturn uses host networking, so incoming packets go through the host's `INPUT` chain, not Docker's `DOCKER-USER` chain. The firewall is kept in `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`, edited by hand. Add the rule there and load the files. Don't use `iptables-save > rules.v4`: with Docker running, that would also write Docker's own chains into the file.

   1. Back up both files:
      ```sh
      sudo cp /etc/iptables/rules.v4 /etc/iptables/rules.v4.bak
      sudo cp /etc/iptables/rules.v6 /etc/iptables/rules.v6.bak
      ```
   2. In `/etc/iptables/rules.v4`, inside the `*filter` section, add this line next to the existing `ACCEPT` rules for 80/443. It must come **before** any final `-A INPUT … -j DROP`/`REJECT` and before `COMMIT`:
      ```text
      -A INPUT -p udp --dport 3478 -m comment --comment orfarchiv-stun -j ACCEPT
      ```
      If the VPS uses IPv6, add the same line to `/etc/iptables/rules.v6`.
   3. Check the syntax without applying anything:
      ```sh
      sudo iptables-restore  --test /etc/iptables/rules.v4
      sudo ip6tables-restore --test /etc/iptables/rules.v6
      ```
      **Expected:** no output.
   4. Apply the rule to the running firewall as well:
      ```sh
      sudo iptables  -I INPUT -p udp --dport 3478 -m comment --comment orfarchiv-stun -j ACCEPT
      sudo ip6tables -I INPUT -p udp --dport 3478 -m comment --comment orfarchiv-stun -j ACCEPT
      ```
      These two commands apply the same rule to the running firewall right away. Reloading the whole file with `iptables-restore` would flush the `filter` table and drop Docker's `DOCKER`/`DOCKER-USER` rules until Docker is restarted. The file edit from sub-step 2 makes the rule survive a reboot.

   **Expected:** `sudo iptables -L INPUT -n --line-numbers | grep orfarchiv-stun` shows `ACCEPT udp ... dpt:3478` (same for `ip6tables`). If the provider also has a cloud firewall, open 3478/udp there too. TCP 3478 stays closed, because browsers use UDP for STUN.

4. **Vercel env variable**
   Vercel → project `orfarchiv` → `Settings → Environment Variables → Add`:
   - Key `PUBLIC_SYNC_STUN_URL`, value `stun:relay.orfarchiv.news:3478`, environments **Production, Preview, Development**.
     **Expected:** the variable is listed. It takes effect on the next deployment.

#### Verify

From a machine that is **not** the VPS:

```sh
docker run --rm --entrypoint turnutils_stunclient coturn/coturn:<COTURN_TAG> relay.orfarchiv.news
```

**Expected:** output contains `UDP reflexive addr: <YOUR_PUBLIC_IP>:<PORT>`, and the IP matches `curl -4 -s ifconfig.me` on that machine.

Browser check: open https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/, remove the default server, add `stun:relay.orfarchiv.news:3478`, and press "Gather candidates".
**Expected:** at least one candidate of type `srflx` with your public IP.

```sh
ssh <vps> 'cd <compose-dir> && docker compose logs orfarchiv-stun'
```

**Expected:** empty or start-up lines only, with no client IPs.

#### Rollback

- `docker compose rm -sf orfarchiv-stun`, and remove the entry from the compose file.
- Remove the `orfarchiv-stun` line from `/etc/iptables/rules.v4` and `rules.v6` (or restore the `.bak` copies from step 3), then remove the rule from the running firewall:
  ```sh
  sudo iptables  -D INPUT -p udp --dport 3478 -m comment --comment orfarchiv-stun -j ACCEPT
  sudo ip6tables -D INPUT -p udp --dport 3478 -m comment --comment orfarchiv-stun -j ACCEPT
  ```
- Delete `PUBLIC_SYNC_STUN_URL` on Vercel. The UI then uses `iceServers: []`: direct connections only work on the same network, and everything else goes through the relay. Sync keeps working.

#### Hand back to Claude

- The final STUN URL (`stun:relay.orfarchiv.news:3478`) for local docs and tests.
- The coturn tag and digest that were deployed, and any flags that had to be dropped.
- No secrets are involved.

#### Troubleshooting

- **`turnutils_stunclient` times out** → UDP 3478 is blocked by iptables (the line sits after a `DROP` rule in the rules file, or it was only added to the running firewall and not to `rules.v4`/`rules.v6`, so a reboot removed it) or by the provider's cloud firewall, or the container isn't using host networking.
- **The reflexive address is a private IP like `172.x`** → the container isn't on `network_mode: host`.
- **The container restarts in a loop** → an unknown flag for this coturn version. Check `docker compose logs orfarchiv-stun` (temporarily remove `--no-stdout-log`), then remove the flag.
- **The Trickle ICE page shows only `host` candidates** → the browser can't reach UDP 3478. Try a different network to rule out a restrictive local firewall.

## Acceptance criteria

- [ ] Given a client outside the VPS, when it sends a STUN binding request to `relay.orfarchiv.news:3478/udp`, then it receives its public reflexive address.
- [ ] Given the coturn container, then it only provides STUN: a TURN allocation request is refused (Trickle ICE with a `turn:` URL gathers no `relay` candidates).
- [ ] Given the container logs, then they contain no client IP addresses.
- [ ] `PUBLIC_SYNC_STUN_URL` is set on Vercel for all environments.

## Technical notes

- Consumed by story 08 (`iceServers`). The browser connects to STUN over UDP, which CSP doesn't restrict.
- coturn docs: https://github.com/coturn/coturn/blob/master/README.turnserver
- The VPS firewall is plain iptables, with the rules kept by hand in `/etc/iptables/rules.v4` / `rules.v6`, not ufw. Epic 0001 story 07 shows `ufw` commands, but don't copy those. The relay from story 04 needs no new firewall rule: it listens on `127.0.0.1` only, and nginx serves the existing port 443.

## Out of scope

- TURN relaying. The WebSocket relay from story 03 is the fallback.
- STUN over TLS (`stuns:`). Browsers rarely use it, and it would need certificate handling.
