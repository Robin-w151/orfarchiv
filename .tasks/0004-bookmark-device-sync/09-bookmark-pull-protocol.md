# 09: Bookmark pull protocol

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 07
**Size:** M — request/response over the message layer, a pure merge function, Dexie writes in one transaction and notifications; clear rules, moderate test surface

## User story

As a user, I want to pull the bookmarks I don't have yet from another device, and have viewed status carried over, so that my reading list is the same everywhere without extra effort.

## Description

**Requester (`pullBookmarks(peerId)`):**

1. Sends `sync-request { requestId }` to the peer.
2. Waits for `sync-response { requestId, stories: Story[] }`. Chunking is handled by the frame layer. Timeout: 20 s after the last received chunk. A peer that leaves mid-transfer → error `PeerLeft`.
3. Decodes each item with the `Story` schema ([ui/src/lib/models/story.ts](../../ui/src/lib/models/story.ts)). Invalid items are skipped and counted.
4. Merges with the local Dexie `stories` table in **one** `rw` transaction:
   - `id` not stored locally → insert `{ ...story, isBookmarked: 1, isViewed: story.isViewed === 1 ? 1 : 0 }`.
   - `id` stored locally, remote `isViewed === 1`, local `isViewed !== 1` → `modify({ isViewed: 1 })`.
   - anything else → no change. Viewed status never goes back to not viewed, and local title, URL and timestamp are never overwritten.
5. Returns `{ added, markedViewed, skippedInvalid }`.

The merge decision is a pure function, `planBookmarkMerge(local: Story[], remote: Story[]) → { toAdd, toMarkViewed }`, kept separate from Dexie so it can be unit tested.

**Source (responder):**

- Is only reachable while its Synchronisierung section is open (story 07 lifecycle). It answers every `sync-request` from a peer whose `hello` it has received, with its full `stories` table (`db.stories.toArray()`), and sends no other fields.
- Shows an info notification: "‹deviceName› hat deine Lesezeichen abgerufen", using the existing notifications store ([ui/src/lib/stores/notifications.ts](../../ui/src/lib/stores/notifications.ts)). At most one notification per peer per 10 s.
- Runs at most one response per peer at a time. A repeated request while one is in progress is ignored.

**Requester feedback** (consumed by story 10): the `pullBookmarks` result or a tagged error (`Timeout`, `PeerLeft`, `TransferFailed`).

**Store API:** add `mergeFromRemote(stories)` to [ui/src/lib/stores/bookmarks.ts](../../ui/src/lib/stores/bookmarks.ts), or a sibling in the sync service that uses the same `BookmarksDb`. Prefer exporting a function that uses the existing `db` instance over opening a second Dexie instance. `liveQuery` updates the UI automatically.

## Acceptance criteria

- [ ] Given local `{A}` and remote `{A, B, C}`, when pulling, then local becomes `{A, B, C}`, and the result is `added: 2, markedViewed: 0`.
- [ ] Given local A not viewed and remote A viewed, then local A becomes viewed (`markedViewed: 1`).
- [ ] Given local A viewed and remote A not viewed, then local A stays viewed.
- [ ] Given local A with title "X" and remote A with title "Y", then the local title stays "X".
- [ ] Given remote bookmarks that the user deleted locally earlier, then they are added again (documented limitation, so a test pins this behaviour).
- [ ] Given a remote list containing one malformed item, then the valid items are merged and `skippedInvalid: 1`.
- [ ] Given identical lists, then the result is all zeros and nothing is written.
- [ ] Given 2,000 remote bookmarks, then the pull finishes and the merge runs as a single Dexie transaction. A test with a failing write leaves the local table unchanged.
- [ ] Given the source device receives a request, then it shows the "hat deine Lesezeichen abgerufen" notification with the requester's device name.
- [ ] Given the source leaves mid-transfer, then the requester gets `PeerLeft` and the local table is unchanged.

## Technical notes

- New: `ui/src/lib/services/sync/bookmarkSync.ts` (protocol handlers + `planBookmarkMerge`). Register frame kinds `sync-request` / `sync-response` in `syncFrames.ts`.
- The `isBookmarked` / `isViewed` flags are numbers so IndexedDB can index them (see the comment in `story.ts`).
- Dexie: `db.transaction('rw', db.stories, async () => { await db.stories.bulkAdd(toAdd); await db.stories.where('id').anyOf(ids).modify({ isViewed: 1 }); })`.
- Payload size: about 300 B/story, so 2,000 stories ≈ 600 KB, which comes to about 40 chunks.
- Notification text in German. Keep the copy short, matching existing notifications.

## Testing

- `bookmarkSync.spec.ts`: an `it.each` table over `planBookmarkMerge` cases (the acceptance criteria above).
- A merge integration test against Dexie with `fake-indexeddb` (new dev dependency in `ui`, approved; pin the exact version, at least 48 h old).
- E2E (two contexts + local relay): seed bookmarks in context B via IndexedDB, trigger the pull in A through a dev hook (until story 10 adds the button), and assert A's bookmarks page lists them.

## Out of scope

- Push, two-way sync, deletion sync, selective import (epic non-goals).
- UI (story 10).
