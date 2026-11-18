# 08: WebRTC transport with fallback

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 07
**Size:** L — WebRTC negotiation, ICE handling, per-peer transport switching and timeouts; browser differences and NAT behaviour make it uncertain and hard to test without real devices

## User story

As a user, I want my devices to talk to each other directly when they can, so that my (encrypted) bookmarks usually don't pass through the server at all.

## Description

- For each peer whose `hello` has arrived, the device with the lexicographically smaller `peerId` creates an `RTCPeerConnection` and an ordered, reliable data channel `orfarchiv-sync`. The other device waits for the offer. This avoids "glare", where both sides send offers at once.
- Signaling messages are frames of kind `signal { description?: RTCSessionDescriptionInit, candidate?: RTCIceCandidateInit }`. They are encrypted and sent through the relay (story 07), so the relay never sees SDP or candidate IPs.
- ICE servers: `[{ urls: PUBLIC_SYNC_STUN_URL }]` pointing to the self-hosted STUN server from story 05 (`stun:relay.orfarchiv.news:3478`). If the variable is unset, use `iceServers: []`, so only local network connections work and everything else falls back to the relay. Never fall back to a public third-party STUN server. No TURN, because the relay is the fallback.
- **Transport choice per peer:** start on `relay`. When the data channel reaches `open`, switch to `direct`. If it isn't open within `SYNC_WEBRTC_CONNECT_TIMEOUT_MS = 5_000`, close the peer connection and stay on `relay` for the rest of the session with that peer (no retry loop). If the channel later closes or `connectionState` becomes `failed`/`disconnected` for more than 3 s, fall back to `relay`.
- A message that is mid-transfer when the transport switches: each chunked message is sent entirely over the transport chosen when sending started. If that transport dies mid-message, the receiver's reassembly times out, and the pull (story 09) reports an error and can be retried.
- Data channel backpressure: wait while `bufferedAmount > 1 MiB`, using `bufferedamountlowthreshold`.
- The same frames and the same encryption as on the relay, even though DTLS already encrypts the channel. This keeps one code path and one trust model: authentication comes from the group key, not from DTLS fingerprints.
- `syncPeers[].transport` reflects the current transport.
- Close all peer connections when the `SyncClient` disconnects (hidden tab, secret change).
- Add `PUBLIC_SYNC_STUN_URL` handling. WebRTC isn't controlled by CSP `connect-src` in current browsers, so no CSP change is expected. Verify this in Chromium, Firefox and WebKit.

## Acceptance criteria

- [ ] Given two contexts in the same browser on localhost, when both are online, then the transport becomes `direct` within 5 s, and frames flow over the data channel (relay `send` count stays flat while messages are exchanged).
- [ ] Given WebRTC is made to fail (e.g. `RTCPeerConnection` stubbed to never open, or `iceServers: []` with host candidates filtered out), then after 5 s the transport is `relay` and messaging still works.
- [ ] Given an open data channel that is then closed, then within 3 s the peer falls back to `relay` without user action.
- [ ] Given both peers negotiate at the same time, then exactly one connection is established (no glare).
- [ ] Given a 1 MiB message over `direct`, then it arrives intact, and `bufferedAmount` never exceeds the threshold by more than one chunk.
- [ ] Signaling frames that reach the relay are only ciphertext (checked in a relay-side test hook or by inspecting frames in the test).
- [ ] Works in the Playwright `chromium`, `firefox` and `webkit` projects, or each failing engine is documented with a `TODO` and falls back to `relay`.

## Technical notes

- New: `ui/src/lib/services/sync/webRtcTransport.ts`, and a transport router in `syncClient.ts` that picks `direct` or `relay` per peer.
- Constants in [ui/src/lib/configs/client.ts](../../../ui/src/lib/configs/client.ts): `SYNC_WEBRTC_CONNECT_TIMEOUT_MS`, `SYNC_WEBRTC_DISCONNECT_GRACE_MS`, `SYNC_DATACHANNEL_BUFFER_HIGH_BYTES`.
- Follow the "perfect negotiation" pattern only as far as needed. With deterministic offerer selection, the polite/impolite roles are fixed.
- Check [ui/playwright.config.ts](../../../ui/playwright.config.ts) for the configured browser projects. WebKit on Linux may not do WebRTC host candidates without flags; document this rather than fight it.
- This story touches no relay code.

## Testing

- Unit: transport router state machine with fake transports (`relay` → `direct` → fallback → timeout) using `it.each` on event sequences, and Vitest fake timers.
- Manual: two tabs against a local relay (`PORT=3004`, see the epic assumptions). Check that the transport switches to `direct`, and that it stays on `relay` with `media.peerconnection.enabled = false` in Firefox. No e2e test in this story.
- Real NAT behaviour is verified manually in story 12.

## Out of scope

- TURN, ICE restarts, multiple data channels.
- The bookmark protocol (story 09), which works over either transport.
