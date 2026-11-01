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

Constants: `RELAY_PROTOCOL_VERSION = 1`, `RELAY_MAX_MESSAGE_BYTES = 65_536`, `RELAY_MAX_PEERS_PER_ROOM = 16`, `RELAY_RATE_LIMIT_MESSAGES_PER_SECOND = 50`.

## Acceptance criteria

- [ ] Given a valid `join`/`send` JSON string, when decoded with the client-message schema, then it yields a typed value.
- [ ] Given a room ID that isn't 64 lowercase hex chars, a peer ID with forbidden characters, an unknown `type`, or extra unknown fields, when decoded, then decoding fails.
- [ ] Given each relay message type, when encoded and decoded again, then the result is unchanged.
- [ ] `RelayErrorCode` and the message types are PascalCase `as const` objects with matching type aliases.
- [ ] `npm run lint` and `npm run test` pass in `shared`.

## Technical notes

- New folder `shared/src/relay/` containing `relay.ts` (Effect `Schema` structs/unions for `RelayClientMessage` and `RelayServerMessage`, plus `decode`/`encode` helpers using `Schema.fromJsonString`) and `relay.constants.ts`.
- Follow the existing modules ([shared/src/search/search.ts](../../shared/src/search/search.ts), [search.constants.ts](../../shared/src/search/search.constants.ts)) for structure and style.
- Use only `effect` (already a peer dependency), with no Node or DOM APIs, so the module runs in the browser and in Node.
- After merging, bump the `shared` submodule in `ui` (`src/lib/shared/common`) as part of story 07, and in `relay` as part of story 03.

## Testing

- `shared/src/relay/relay.spec.ts` with `it.each` tables of valid and invalid messages.

## Out of scope

- The encrypted payload format (story 06/07). The relay server itself (story 03).
