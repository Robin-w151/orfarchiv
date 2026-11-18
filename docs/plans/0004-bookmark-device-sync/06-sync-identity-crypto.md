# 06: Sync identity and crypto

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** –
**Size:** S — a WebCrypto wrapper and a small persisted store; well-defined primitives, testable in Node 24

## User story

As a user, I want my device to hold a sync secret and a device name, and to derive an encryption key from the secret, so that only devices with the same secret can read my sync data.

## Description

**Sync settings store** (localStorage, key `sync`, separate from `settings` so it can be reset on its own):

| Field        | Type                                     | Default                                                                                                             |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `secret`     | `string \| undefined` (lowercase UUIDv4) | `undefined` (sync off)                                                                                              |
| `deviceName` | `string` (1–40 chars, trimmed)           | derived from `navigator.userAgent`, e.g. `Android · Chrome`, `iPhone · Safari`, `macOS · Firefox`, fallback `Gerät` |

Store methods: `generateSecret()` (`crypto.randomUUID()`), `setSecret(value)` (validates; returns an error for invalid input), `clearSecret()`, `setDeviceName(name)`.

**Crypto module** (pure functions over `crypto.subtle`):

- `deriveSyncKeys(secret)` → `{ roomId: string /* 64 hex */, key: CryptoKey /* AES-GCM-256, non-extractable */ }`. The secret is imported as HKDF key material (UTF-8 bytes of the normalized UUID), with an empty salt and the info strings `orfarchiv-sync/room/v1` and `orfarchiv-sync/key/v1`.
- `encrypt(key, plaintext: Uint8Array, additionalData: Uint8Array)` → base64url string of `iv(12 bytes) ‖ ciphertext+tag`. Every call uses a fresh random IV. `additionalData` is passed to AES-GCM, so it is authenticated but not sent. Story 07 decides its content.
- `decrypt(key, payload, additionalData: Uint8Array)` → `Uint8Array`. Fails with a tagged `SyncDecryptError` on bad base64, too-short input, a failed auth tag or different additional data.
- `normalizeSecret(input)` → trims, lowercases and checks the UUID (accepts v4 only). Fails with `InvalidSyncSecretError`.

## Acceptance criteria

- [ ] Given the same secret on two devices, when deriving keys, then the `roomId`s are equal and a payload encrypted on one decrypts on the other.
- [ ] Given two different secrets, then the `roomId`s differ and decryption with the wrong key fails with `SyncDecryptError`.
- [ ] Given the same plaintext encrypted twice, then the payloads differ (fresh IV).
- [ ] Given a tampered payload (one flipped byte), then decryption fails.
- [ ] Given a payload encrypted with additional data X, when decrypted with additional data Y ≠ X, then it fails with `SyncDecryptError`.
- [ ] Given input `" 3F2504E0-4F89-41D3-9A0C-0305E82C3301 "`, then `normalizeSecret` returns the trimmed lowercase form. Given `"abc"` or a v1 UUID, then it fails.
- [ ] `roomId` matches a fixed test vector (so a change in the derivation is caught by a test).
- [ ] The derived `CryptoKey` has `extractable: false`.
- [ ] The secret is never logged.

## Technical notes

- New files: `ui/src/lib/models/sync.ts` (Effect `Schema` for `SyncSettings` and error classes), `ui/src/lib/services/sync/syncCrypto.ts`, `ui/src/lib/stores/syncSettings.ts` (pattern from [ui/src/lib/stores/settings.ts](../../../ui/src/lib/stores/settings.ts): `svelte-persisted-store`, schema validation of stored data, browser guard).
- Constants in [ui/src/lib/configs/client.ts](../../../ui/src/lib/configs/client.ts): `SYNC_STORE_NAME = 'sync'`, the HKDF info strings, `SYNC_DEVICE_NAME_MAX_LENGTH = 40`.
- base64url helper: use `Uint8Array.prototype.toBase64({ alphabet: 'base64url', omitPadding: true })` / `Uint8Array.fromBase64` if the target browsers support it, otherwise a small helper. `TODO: confirm` browser support in story 07 testing.
- No explicit return types, and fixed string sets as `as const` objects (project conventions).

## Testing

- `syncCrypto.spec.ts` (Vitest, Node 24 `crypto.subtle`), with `it.each` for normalization cases and tamper positions.
- `syncSettings.spec.ts` for invalid stored data falling back to defaults, and for device-name derivation from sample UA strings.

## Out of scope

- Network code (story 07), UI (story 10).
