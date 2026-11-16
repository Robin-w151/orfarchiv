# 02: Shared relay protocol

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** –
**Size:** S — a schema module and constants in the existing shared-feature pattern, with straightforward tests

## User story

As a developer, I want the relay wire protocol defined once in `orfarchiv-shared`, so that the relay (story 03) and the UI client (story 07) can't drift apart.

## Description

This defines the plaintext envelope that the relay can read. Everything sync-specific sits inside an opaque, encrypted `payload` string that the relay never decodes.

Client → relay:

| `type` | Fields                                                                                              | Meaning                                    |
| ------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `join` | `room` (64 hex chars), `peerId` (22–36 chars, `[A-Za-z0-9_-]`), `version` (protocol version number) | Join a room. Only allowed once per socket. |
| `send` | `to` (peerId), `payload` (base64url string)                                                         | Forward to one peer in the same room.      |

Relay → client:

| `type`    | Fields                    | Meaning                                                                                                     |
| --------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `peers`   | `peers: string[]`         | Full peer list of the room, excluding the receiver. Sent after `join` and whenever someone joins or leaves. |
| `message` | `from`, `payload`         | A forwarded `send`.                                                                                         |
| `error`   | `code` (`RelayErrorCode`) | `InvalidMessage`, `RoomFull`, `RateLimited`, `TooLarge`, `NotJoined`, `UnknownPeer`, `UnsupportedVersion`.  |

Constants: `RELAY_PROTOCOL_VERSION = 1`, `RELAY_MAX_MESSAGE_BYTES = 65_536`, `RELAY_MAX_PEERS_PER_ROOM = 16`, `RELAY_RATE_LIMIT_MESSAGES_PER_SECOND = 50`, `RELAY_JOIN_TIMEOUT_MS = 10_000`, `RELAY_PING_INTERVAL_MS = 30_000`.

Close codes, as `RelayCloseCode = { JoinTimeout: 4000, RoomFull: 4001, UnsupportedVersion: 4002, TooLarge: 1009, ServerFull: 1013 } as const`. The relay sends the matching `error` frame first where there is one. The close code lets the client tell these cases apart even if the socket closes before that frame arrives.

## Acceptance criteria

- [ ] Given a valid `join`/`send` JSON string, when decoded with the client-message schema, then it yields a typed value.
- [ ] Given a room ID that isn't 64 lowercase hex chars, a peer ID with forbidden characters, or an unknown `type`, when decoded, then decoding fails.
- [ ] Given a valid message with extra unknown fields, when decoded, then decoding succeeds and the extra fields are not in the decoded value.
- [ ] Given a `join` with `version: 2` and an extra field, when decoded, then decoding succeeds with `version: 2`, so the relay can answer `UnsupportedVersion`.
- [ ] Given each relay message type, when encoded and decoded again, then the result is unchanged.
- [ ] `RelayErrorCode`, `RelayCloseCode` and the message types are PascalCase `as const` objects with matching type aliases.
- [ ] `npm run lint` and `npm run test` pass in `shared`.

## Technical notes

- New folder `shared/src/relay/` containing `relay.ts` (Effect `Schema` structs/unions for `RelayClientMessage` and `RelayServerMessage`, plus `decode`/`encode` helpers using `Schema.fromJsonString`) and `relay.constants.ts`.
- Follow the shared folder layout of [shared/src/search/](../../shared/src/search/) (`<feature>.ts` + `<feature>.constants.ts`). For the Effect 4 Schema style (`Schema.Struct`, `.check(...)`, `Schema.Literals`, `decodeUnknownResult`), follow [ui/src/lib/models/story.ts](../../ui/src/lib/models/story.ts) and [ui/src/lib/api/info.ts](../../ui/src/lib/api/info.ts).
- Unknown fields are ignored and dropped (Effect 4's default `onExcessProperty: 'ignore'`), so either side can add optional fields without breaking older versions.
- Versioning rule: the format of `type`, `version` and the existing `join` fields never changes. A new protocol version may only add optional fields. This way an older relay can always decode a newer `join` and answer with `UnsupportedVersion`.
- Use only `effect` (already a peer dependency), with no Node or DOM APIs, so the module runs in the browser and in Node.
- After merging, bump the `shared` submodule in `ui` (`src/lib/shared/common`) as part of story 07, and in `relay` as part of story 03.

## Testing

- `shared/src/relay/relay.spec.ts` with `it.each` tables of valid and invalid messages.

## Out of scope

- The encrypted payload format (story 06/07). The relay server itself (story 03).
