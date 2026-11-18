# 07: Relay client and presence

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 02, 03, 06
**Size:** M — connection lifecycle, encrypted message layer with chunking, and a presence store; several edge cases (reconnect, visibility, peer churn)

## User story

As a user, I want to see which of my other devices are online right now, so that I can choose one to pull bookmarks from.

## Description

**Connection lifecycle** (`SyncClient`, a single instance in the browser):

- Connects to `PUBLIC_SYNC_RELAY_URL` **only while the Synchronisierung section is open** (story 10), and only when all of these are true: the URL is set, `syncSettings.secret` is set, `document.visibilityState === 'visible'`, and `navigator.onLine`. Disconnects as soon as any of them becomes false, when the user leaves the section or the settings page, or when the secret changes (then reconnects with the new room). Outside the sync section, the app opens no sync connections at all.
- API: `syncClient.acquire()` returns a release function. The client connects while at least one holder exists, so the section can mount and unmount without races.
- A fresh `peerId` (22 chars, base64url of 16 random bytes) per connection.
- Reconnects with exponential backoff (1 s → 30 s, with jitter) after unexpected closes. After `RoomFull` or `UnsupportedVersion`, it doesn't reconnect and exposes the error state instead.

**Encrypted message layer** (inside the relay `payload`):

- Plaintext frame: JSON `{ v: 1, kind, msgId, seq, final, body }`, encrypted with the group key from story 06. Every frame is encrypted with the additional data `orfarchiv-sync/v1|<roomId>|<fromPeerId>|<toPeerId>` (UTF-8). The sender uses its own `peerId` and the target's. The receiver uses the relay envelope's `from` and its own `peerId`. A message whose JSON is larger than `SYNC_CHUNK_BYTES = 16_384` is split into chunks sharing a `msgId`, and the receiver reassembles them by `seq` until `final`. Incomplete messages are dropped after 30 s, and a reassembly buffer is capped at 5 MiB per peer.
- `kind`s defined here: `hello { deviceName, protocol: 1 }` and `bye`. Stories 08/09 add `signal` and `sync-request`/`sync-response`.
- The message layer sits behind a `SyncTransport` interface (`send(peerId, frame)` and an `onFrame` stream). This story implements `RelayTransport`, and story 08 adds `WebRtcTransport` behind the same interface.

**Presence:**

- On `peers` from the relay: send `hello` to every new peer and drop peers that left. A peer shows up as an online device only after its `hello` decrypts. Peers that can't be decrypted are ignored, so devices with a different key never appear.
- `syncPeers` store: `Array<{ peerId, deviceName, transport: 'relay' | 'direct', connectedSince }>`, sorted by name.
- `syncStatus` store: `Disabled | Connecting | Connected | Offline | Error(code)`, as an `as const` object.
- Answer an incoming `hello` from an unknown peer with your own `hello`, so both sides see each other even if the `peers` broadcasts arrive out of order.

**Security headers:** add the origin of `PUBLIC_SYNC_RELAY_URL` (e.g. `wss://relay.orfarchiv.news`) to `connect-src` in [ui/csp-config.js](../../../ui/csp-config.js), read from env at build time. Without it, the CSP blocks the WebSocket.

**Docker image:** the build stage of [ui/Dockerfile](../../../ui/Dockerfile) gets `ARG PUBLIC_SYNC_RELAY_URL=` / `ARG PUBLIC_SYNC_STUN_URL=` and `ENV PUBLIC_SYNC_RELAY_URL=$PUBLIC_SYNC_RELAY_URL` / `ENV PUBLIC_SYNC_STUN_URL=$PUBLIC_SYNC_STUN_URL` before `npm run build`. The `env.ts` schemas treat an empty string as unset (e.g. `Schema.optional` of a `Schema.String` that maps `""` → `undefined` before the URL check), so a build without the args hides the section instead of failing.

## Acceptance criteria

- [ ] Given two browser contexts with the same secret and a local relay, when both open the app, then each shows the other's device name in `syncPeers` within 3 s.
- [ ] Given a third context with a different secret, then it never appears in the first two contexts' lists (and vice versa).
- [ ] Given no holder has called `acquire()` (the user never opens the sync section), then no WebSocket is opened.
- [ ] Given the holder releases (the user leaves the section), then the socket closes within 1 s.
- [ ] Given a connected device, when its tab is hidden, then the socket closes and the other device removes it from the list. When it becomes visible again, it reconnects and reappears.
- [ ] Given the relay restarts, then clients reconnect with backoff and presence is restored without reloading.
- [ ] Given a 100 KiB message, when sent through the message layer, then it is chunked, every relay frame is ≤ 64 KiB, and the receiver gets the original.
- [ ] Given a frame that fails to decrypt, then it is dropped without throwing, and presence is unaffected.
- [ ] Given `PUBLIC_SYNC_RELAY_URL` is unset, then no connection is attempted and `syncStatus` is `Disabled`.
- [ ] The production build's CSP header contains the relay origin in `connect-src`.
- [ ] Given `docker build --build-arg PUBLIC_SYNC_RELAY_URL=wss://relay.orfarchiv.news/ws .`, then the built app's CSP `connect-src` contains `wss://relay.orfarchiv.news` and the sync client is enabled.
- [ ] Given `docker build .` without the args, then the build succeeds and `syncStatus` is `Disabled`.
- [ ] Given a frame for B whose relay envelope `from` is changed to another peer C in the same room, then B fails to decrypt it and drops it.

## Technical notes

- New files under `ui/src/lib/services/sync/`: `syncClient.ts`, `relayTransport.ts`, `syncFrames.ts` (frame schema, chunk/reassemble, encrypt/decrypt via story 06), `syncTransport.ts` (interface). Stores in `ui/src/lib/stores/syncPeers.ts` / `syncStatus.ts`.
- Relay envelope: `#common/relay/relay.ts` from story 02. Bump the `src/lib/shared/common` submodule in `ui`.
- The client is a browser-only singleton (`if (browser)` guard as in [bookmarks.ts](../../../ui/src/lib/stores/bookmarks.ts)). It is **not** started from the root layout. Story 10's `Sync.svelte` calls `acquire()` on mount and the returned release on destroy. Until story 10 exists, tests call `acquire()` directly.
- CSP: [ui/csp-config.js](../../../ui/csp-config.js) is imported by [ui/vite.config.ts](../../../ui/vite.config.ts) after `dotenv.config()`. Turn it into a function of env, or append the origin in `vite.config.ts`.
- Declare `PUBLIC_SYNC_RELAY_URL` and `PUBLIC_SYNC_STUN_URL` in [ui/src/env.ts](../../../ui/src/env.ts) as `static: true, public: true`, optional (epic assumptions). Document `PUBLIC_SYNC_RELAY_URL=ws://localhost:3004/ws` for `.env.local` in the README env section. [ui/playwright.config.ts](../../../ui/playwright.config.ts) stays unchanged.
- Use RxJS (already a dependency) or Effect streams, consistent with the surrounding store code. Decide during implementation and keep to one.

## Testing

- Unit: `syncFrames.spec.ts` (chunking with `it.each` sizes 0, 1 B, 16 KiB, 16 KiB+1, 1 MiB; reassembly out of order; timeout; cap).
- Unit: the presence reducer (peers + hello → list) with a fake transport.
- Unit: the frame layer's additional data, including a relabelled `from` that fails to decrypt.
- Manual: two tabs against a local relay (`PORT=3004`), see the epic assumptions. No e2e test in this story; e2e coverage for sync lives in stories 10 and 11.

## Out of scope

- WebRTC (story 08), bookmark transfer (story 09), visible UI (story 10).
