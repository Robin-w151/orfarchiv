# 10: Sync settings UI and link pairing

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 04, 09
**Size:** M — a new settings section with several states, a pairing confirmation flow and e2e tests; follows existing components

## User story

As a user, I want a "Synchronisierung" section in the settings where I can set up sync, share the secret via a link, see my online devices and pull bookmarks from one, so that I can do everything from one place.

## Description

New section `Synchronisierung` in the settings grid ([ui/src/lib/components/settings/Settings.svelte](../../ui/src/lib/components/settings/Settings.svelte)), placed after `General`. Hidden entirely if `PUBLIC_SYNC_RELAY_URL` is unset.

**State: sync off** (no secret):

- Short text: "Synchronisiere Lesezeichen zwischen deinen Geräten – ohne Konto, Ende-zu-Ende-verschlüsselt."
- Button "Neuen Schlüssel erstellen" → `generateSecret()`.
- Button "Mit vorhandenem Schlüssel verbinden" → opens an input that validates with `normalizeSecret`, showing "Ungültiger Schlüssel" on error.

**State: sync on:**

- Device name (`Input`), saved on blur/enter, max 40 chars.
- Status line from `syncStatus`: "Verbunden", "Verbinde…", "Offline", or an error text for `RoomFull` / `UnsupportedVersion`.
- **Online devices** list (`SectionList` / `Item`), one row per `syncPeers` entry: device name, a small badge "Direkt" or "Relay", and a button **"Lesezeichen abrufen"**. While a pull is running, that button shows a spinner and all pull buttons are disabled. Result as a notification: "12 hinzugefügt, 3 als gelesen markiert" / "Bereits aktuell" / an error text (timeout, device gone, failed transfer).
- Empty list: "Keine anderen Geräte gefunden. Öffne auf deinem anderen Gerät ebenfalls Einstellungen → Synchronisierung."
- A short permanent hint above the list: "Geräte sind nur sichtbar, solange dieser Bereich auf beiden Geräten geöffnet ist."
- Connection lifecycle: `Sync.svelte` calls `syncClient.acquire()` on mount when sync is on, and releases on destroy or when sync is turned off (story 07).
- "Gerät hinzufügen": button **"Link teilen"** → `navigator.share({ title: 'ORF Archiv Synchronisierung', url })` if available, otherwise copy to clipboard with the "Link kopiert" notification (reuse the existing copy-link pattern and `NOTIFICATION_COPY_LINK_TIMEOUT`). A placeholder slot for the QR code (story 11).
- "Schlüssel anzeigen" toggles showing the UUID, with a copy button, for manual entry.
- **"Synchronisierung beenden"** (danger) → asks for confirmation (`Modal`), then `clearSecret()`. Local bookmarks are kept.
- **"Neuen Schlüssel erstellen"** → asks for confirmation ("Andere Geräte müssen neu verbunden werden"), then generates a new secret.
- One-line privacy note: "Der Server sieht nur verschlüsselte Daten, IP-Adressen und Zeitpunkte."

**Link pairing:**

- Link format: `${location.origin}/settings#sync=<secret>`.
- On load of `/settings` with a `#sync=` fragment: run `normalizeSecret`, then remove the fragment immediately with `history.replaceState` so it doesn't stay in history or get shared again by accident.
  - Invalid → error notification.
  - Same as the current secret → info "Bereits verbunden".
  - No current secret → `Modal` "Mit diesem Schlüssel synchronisieren?" with Ja/Abbrechen.
  - A different current secret → `Modal` warning that the current group will be left, with Ja/Abbrechen.
- Hint text under "Link teilen" for iOS: "Auf iPhone/iPad die installierte App verwenden: Link öffnet sonst Safari." The full workaround is the QR scanner in story 11.

## Acceptance criteria

- [ ] Given `PUBLIC_SYNC_RELAY_URL` is unset, then the section isn't rendered.
- [ ] Given sync is on, when the user opens the news page (not settings), then no WebSocket to the relay is open. When they open settings, it connects. When they leave, it disconnects.
- [ ] Given no secret, when the user clicks "Neuen Schlüssel erstellen", then the section switches to the "sync on" state and the secret is persisted across reloads.
- [ ] Given an invalid manual secret, then "Ungültiger Schlüssel" is shown and nothing is saved.
- [ ] Given device A opens device B's share link, when confirming the dialog, then A uses B's secret, `location.hash` is empty afterwards, and both devices list each other.
- [ ] Given A cancels the dialog, then A's secret is unchanged and the fragment is removed.
- [ ] Given two online devices, when A clicks "Lesezeichen abrufen" on B, then A's bookmarks page contains B's bookmarks and a result notification with the counts is shown.
- [ ] Given a pull is running, then all pull buttons are disabled until it finishes.
- [ ] Given "Synchronisierung beenden" is confirmed, then the secret is cleared, the socket closes, and bookmarks are untouched.
- [ ] The section is keyboard-operable, buttons have accessible names that include the device name (e.g. `aria-label="Lesezeichen von Pixel · Chrome abrufen"`), and dialogs trap focus like the existing `Modal`.
- [ ] Given the PR's Vercel preview deployment, when the `Test` workflow runs with `TEST_SYNC_REQUIRED: 'true'`, then the sync specs run (not skip) against the production relay and pass.
- [ ] Storybook has stories for the section in its states (off, on/empty, on/with devices, pull running), and `npm run storybook:smoke` passes.

## Technical notes

- New: `ui/src/lib/components/settings/sync/Sync.svelte` (+ subcomponents, e.g. `SyncDevices.svelte`, `SyncPairing.svelte`). Reuse `Section`, `SectionList`, `Item`, `Button`, `Input`, `Modal`, `AlertBox` from `ui/src/lib/components/shared/`.
- Fragment handling: in `Sync.svelte` on mount, or in [ui/src/routes/settings/+page.ts](../../ui/src/routes/settings/+page.ts) on the browser side. The fragment must never be read on the server (it isn't sent anyway).
- Existing share/copy code: see [ShareButton.svelte](../../ui/src/lib/components/news/story/header/options/ShareButton.svelte) for `navigator.share` / clipboard usage.
- E2E page object: extend [ui/tests/pages/settings.page.ts](../../ui/tests/pages/settings.page.ts), and add `ui/tests/specs/sync.spec.ts`. It runs against `TEST_BASE_URL` (the Vercel deployment in CI, see [ui/.github/workflows/test.yaml](../../ui/.github/workflows/test.yaml)) and the production relay, using two browser contexts. Each test generates its own secret, because tests run in parallel and share the relay with real users. When the section isn't rendered (relay URL unset), the spec calls `test.skip()`, unless `TEST_SYNC_REQUIRED=true`, in which case it fails.
- Set `TEST_SYNC_REQUIRED: 'true'` in the `Run Playwright tests` step env of [ui/.github/workflows/test.yaml](../../ui/.github/workflows/test.yaml). This is safe because story 04 is done before this story starts: the production relay is live and `PUBLIC_SYNC_RELAY_URL` is set on Vercel, so preview deployments render the section.
- Add stories under `ui/src/stories/` following the existing ones (`*.stories.js`).

## Testing

- E2E: create secret → share link → second context opens link → confirm → both listed → pull → bookmarks visible. Also cover cancel, invalid link and end sync. Locally, run against the local relay on port 3004 (epic assumptions).
- E2E skip logic: with the section hidden, the spec is skipped; with `TEST_SYNC_REQUIRED=true` and the section hidden, it fails.
- Unit: fragment parsing helper (`it.each` over `#sync=…`, `#other`, empty, invalid).
- Storybook smoke.

## Out of scope

- QR display and scanning (story 11).
- Real-device checks (story 12).
