# 03: Relay service

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 01, 02
**Size:** M — a new small service plus repo scaffolding (lint, tests, Dockerfile, CI); the logic is simple, the main work is the setup

## User story

As a user, I want a relay that connects my devices without storing anything, so that sync works even when a direct connection isn't possible.

## Description

A stateless Node WebSocket server in the `relay` submodule.

Behaviour:

- `GET /health` → `200 {"status":"ok","rooms":<n>,"connections":<n>}`. Every other HTTP path → 404. WebSocket upgrades are accepted on `/ws`.
- On connect, the client must send `join` within 10 s, otherwise the socket is closed (code 4000). A second `join` on the same socket → `error InvalidMessage`.
- `join`: if the room already has `RELAY_MAX_PEERS_PER_ROOM` peers → `error RoomFull` and close. If the protocol version is wrong → `error UnsupportedVersion` and close. A peer ID already in the room → the old socket is closed and replaced (this covers reconnects). Then `peers` is sent to everyone in the room.
- `send`: forwarded as `message {from, payload}` only to `to`, and only if `to` is in the sender's room. Otherwise → `error UnknownPeer`.
- On close: the peer is removed, `peers` is broadcast to the others, and the room is deleted when empty.
- Limits: frames larger than `RELAY_MAX_MESSAGE_BYTES` are rejected by `ws` (`maxPayload`). A token bucket per socket enforces `RELAY_RATE_LIMIT_MESSAGES_PER_SECOND`; going over → `error RateLimited`, and over 3× the limit → close. A global connection cap (env `RELAY_MAX_CONNECTIONS`, default 2000) closes new sockets with 1013. A ping every 30 s closes dead sockets.
- Logging: start/stop, counts and errors only. **Never log room IDs, peer IDs, payloads or IP addresses.**
- Config through env: `PORT` (default 8080), `RELAY_MAX_CONNECTIONS`, `RELAY_ALLOWED_ORIGINS` (comma-separated). Upgrades with an `Origin` header not on the list are refused with 403. An entry may contain `*` in the host part, matching one or more of `[a-z0-9-]` (never `.`), so Vercel previews can be allowed without allowing every `*.vercel.app` site. Default: `https://orfarchiv.news,https://develop.orfarchiv.news,https://orfarchiv-*-robins-projects-bb10f956.vercel.app`.
- Nothing is persisted. A restart drops all rooms, and clients reconnect (story 07).

## Acceptance criteria

- [ ] Given two clients joined to room R and one to room S, when a client in R sends to the peer in S, then it gets `UnknownPeer` and the S client receives nothing.
- [ ] Given two clients in the same room, when A sends `{to: B, payload}`, then B receives `{type: 'message', from: A, payload}` with the same payload bytes.
- [ ] Given a room with 16 peers, when a 17th joins, then it gets `RoomFull` and is closed.
- [ ] Given a peer leaves, then the remaining peers get an updated `peers` list, and the room is deleted from memory when empty (checked through `/health`).
- [ ] Given a 70 KiB frame, then the socket is closed with 1009 and the relay keeps running.
- [ ] Given a socket that sends no `join` within 10 s, then it is closed with 4000.
- [ ] Given a disallowed `Origin`, then the upgrade is refused.
- [ ] Given the default allow-list, then `https://orfarchiv-git-feat-x-robins-projects-bb10f956.vercel.app` is accepted, and `https://evil.vercel.app` and `https://orfarchiv-a.b-robins-projects-bb10f956.vercel.app` are refused (`it.each` table).
- [ ] Test logs and code contain no logging of room or peer IDs.
- [ ] `npm run lint`, `npm run test` and `docker build .` succeed. CI publishes `ghcr.io/robin-w151/orfarchiv-relay:<version>` and `:latest` on push to `main`.

## Technical notes

- Repo layout, tooling and versions copied from `scraper`: `package.json` (`type: module`, `engines.node: 24.x`, `#common/*` → `./src/shared/common/src/*.ts`), `eslint.config.js`, `commitlint.config.js`, husky, `vite.config.ts` (build to `dist/`), `vitest.config.ts`, `Dockerfile` (`node:24-alpine`, multi-stage, non-root user, `EXPOSE 8080`, `HEALTHCHECK` on `/health`).
- Add `orfarchiv-shared` as a nested submodule at `src/shared/common` (same URL as [scraper/.gitmodules](../../scraper/.gitmodules)), and import `#common/relay/relay` from story 02.
- Dependencies: `ws` (+ `@types/ws`) and `effect`. Plain Node `http` for `/health` and the upgrade. Effect is used for config and the program lifecycle, following the scraper's patterns; keep it simple.
- Suggested files: `src/index.ts` (bootstrap, graceful SIGTERM), `src/config.ts`, `src/rooms.ts` (pure room registry, easy to unit test), `src/server.ts` (http + ws wiring), `src/rateLimit.ts`.
- CI: copy [scraper/.github/workflows/ci.yaml](../../scraper/.github/workflows/ci.yaml) (jobs `check`, `test`, `release` with SSH commit signing and semantic-release, `image` building `linux/amd64,linux/arm64` and pushing to ghcr), drop the MongoDB steps, and rename the image to `orfarchiv-relay`. It uses the secrets `SSH_SIGNING_KEY`, `SSH_SIGNING_KEY_PUBLIC`, `GIT_NAME` and `GIT_EMAIL` from story 01. Also copy the semantic-release config from the scraper's `package.json`.
- The README documents the env variables and the security model in a few lines. This is an explicitly requested doc for a new repo; keep it short.
- Use the branch decided in the epic's assumptions inside `relay`.

## Testing

- Unit tests for `rooms.ts` (join/leave/replace/full/route) and `rateLimit.ts` with `it.each` tables.
- Integration test that starts the server on a random port and connects with real `ws` clients, covering every acceptance criterion above.
- Manual: `docker run -p 8080:8080 <image>` and `curl localhost:8080/health`.

## Out of scope

- TLS, DNS, nginx and deployment (story 04).
- Any knowledge of bookmarks or encryption. The relay only forwards opaque payloads.
