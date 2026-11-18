# 12: Device QA and release

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** 04, 05, 08, 11
**Size:** M — manual tests on several real devices and networks plus a release; moderate effort, low risk to live systems

## User story

As the maintainer, I want to check sync on real phones and desktops, on real networks, before releasing, so that pairing, direct connections and the relay fallback work outside the test setup.

## Description

NAT traversal, iOS PWA storage, camera permissions and mobile background behaviour can't be tested reliably in CI. This story runs a fixed test matrix on a preview deployment, then releases.

### Runbook

#### Prerequisites

- [ ] Stories 08, 10 and 11 are merged into the `ui` feature branch, and a Vercel preview deployment exists for it. Note its URL as `<PREVIEW_URL>`.
- [ ] `PUBLIC_SYNC_RELAY_URL` (story 04) and `PUBLIC_SYNC_STUN_URL` (story 05) are set on Vercel. `<PREVIEW_URL>` matches the preview pattern in `RELAY_ALLOWED_ORIGINS`.
- [ ] **During every step, both devices have Einstellungen → Synchronisierung open.** Devices are only visible to each other while that section is open.
- [ ] Devices:
  - **iPhone SE (3rd gen):** Safari, plus ORF Archiv installed as a PWA (Share → "Zum Home-Bildschirm").
  - **Fairphone 3:** Android with Chrome. If it runs a different default browser (e.g. on /e/OS), install Chrome for the tests, and note which browser was used.
  - **Desktop:** your development computer with Chrome or Firefox (Firefox is needed for step 6).
- [ ] Two networks: home Wi-Fi, and mobile data (hotspot or the phone's own).
- [ ] A few bookmarks on each device, some marked as viewed.

#### Steps

1. **Pair desktop → Fairphone via QR (camera app)**
   Desktop: open `<PREVIEW_URL>/settings` → Synchronisierung → "Neuen Schlüssel erstellen" → "QR-Code anzeigen". Fairphone: scan it with the system camera app → open the link → confirm.
   **Expected:** both devices list each other within about 3 s. The badge shows "Direkt" when both are on the same Wi-Fi.
2. **Pull on the same network**
   Fairphone: "Lesezeichen abrufen" next to the desktop.
   **Expected:** a count notification on the Fairphone, and the bookmarks page shows the desktop bookmarks. The desktop shows "‹Fairphone› hat deine Lesezeichen abgerufen".
3. **Viewed flag**
   Desktop: mark a bookmark that both devices have as viewed. Fairphone: pull again.
   **Expected:** "0 hinzugefügt, 1 als gelesen markiert", and the bookmark is shown as viewed on the Fairphone.
4. **Pair iPhone PWA via in-app scanner**
   iPhone SE: open the installed PWA → Settings → Synchronisierung → "QR-Code scannen" → allow the camera → scan the desktop QR.
   **Expected:** the confirmation dialog appears, and after confirming, all three devices list each other. Safari has no `BarcodeDetector`, so this step tests the `jsqr` fallback.
   Then, phone to phone: on the iPhone SE, press "Lesezeichen abrufen" next to the Fairphone.
   **Expected:** the Fairphone's bookmarks appear in the PWA, and the Fairphone shows the notification.
   Finally, send yourself the share link via Messages and open it on the iPhone SE.
   **Expected:** it opens in Safari and pairs Safari, not the PWA. This is expected, and the hint text explains it.
5. **Different networks**
   Switch the Fairphone to mobile data and keep the desktop on Wi-Fi. Pull again.
   **Expected:** the pull works, with a badge of either "Direkt" or "Relay". Note which one.
6. **Forced relay fallback**
   Desktop Firefox: `about:config` → `media.peerconnection.enabled = false` (or a Chrome extension that disables WebRTC). Reload and pull from another device.
   **Expected:** the badge shows "Relay" and the pull works. Reset the setting afterwards.
7. **Leaving the section and backgrounding**
   Fairphone: go from Settings to the news page. Then go back to Synchronisierung and switch to another app for 30 s.
   **Expected:** in both cases the Fairphone entry disappears from the other devices within about 10 s, and comes back when Synchronisierung is visible again. On the news page, browser devtools (remote debugging) show no open WebSocket to `relay.orfarchiv.news`.
8. **Leave and rotate**
   iPhone SE: "Synchronisierung beenden". Desktop: "Neuen Schlüssel erstellen".
   **Expected:** the iPhone SE disappears from all lists, and its bookmarks stay. After the rotation, the Fairphone no longer sees the desktop until it is paired again.
9. **Privacy spot check**
   On the VPS:
   ```sh
   ssh <vps> 'cd <compose-dir> && docker compose logs --since 1h orfarchiv-relay'
   ```
   ```sh
   ssh <vps> 'cd <compose-dir> && docker compose logs --since 1h orfarchiv-stun'
   ```
   **Expected:** only start-up lines and counts, with no room IDs, peer IDs or IP addresses. The STUN log is empty or start-up only.
10. **Release**
    Merge the feature branches (shared → relay → ui) as usual, and release `ui` to `develop`, then later to production, following the existing release flow (semantic-release on push, as in epic 0003 story 07).
    **Expected:** `https://develop.orfarchiv.news/settings` shows the Synchronisierung section, and steps 1–2 work there with the production relay.

#### Verify

- All steps 1–9 passed and were recorded as OK/notes in the PR or in this story file.
- `curl -s https://relay.orfarchiv.news/health` shows `connections > 0` while devices are open, and `rooms: 0` after all tabs are closed.

#### Rollback

- Release problem: revert the `ui` release commit / promote the previous Vercel deployment (`Deployments → … → Promote to Production`).
- Hide the feature without a code change: remove `PUBLIC_SYNC_RELAY_URL` on Vercel and redeploy.

#### Hand back to Claude

- The results table (step → OK / issue + device/browser/network).
- Any bugs, with steps to reproduce. These become follow-up fixes.
- Whether direct connections across networks (step 5) were common enough. If not, decide whether TURN on the same coturn instance is worth a follow-up.

#### Troubleshooting

- **No devices listed** → check the console for CSP errors (`connect-src`), check that `/health` works, and check that both devices really have the same secret ("Schlüssel anzeigen").
- **Always "Relay", even on the same Wi-Fi** → the browser hides local IPs behind mDNS addresses, or the router blocks multicast. Usually harmless, since the fallback works. Note it.
- **Scanner shows a black preview on iOS** → the PWA needs the camera permission in iOS Settings → Safari → Camera, or a reinstall after the `Permissions-Policy` change.
- **Origin refused (403)** → the preview URL doesn't match the `RELAY_ALLOWED_ORIGINS` pattern (e.g. a different Vercel team slug).
- **Never "Direkt" across networks, even on simple home routers** → check the STUN server (story 05 Verify section) and that UDP 3478 is open on the VPS firewall.

## Acceptance criteria

- [ ] Given the test matrix, when running steps 1–9, then every step passes or has a recorded, accepted issue.
- [ ] Given the release, when opening production settings, then sync works between two real devices.
- [ ] The relay and STUN logs contain no room IDs, peer IDs or IP addresses.
- [ ] Outside the sync section, no device keeps a relay connection open.

## Technical notes

- Relay deployment: story 04. STUN deployment: story 05. UI behaviour: stories 07–11.
- Release flow for `ui`: semantic-release on `develop`/`main` (see [epic 0003 story 07](../0003-sveltekit-3-migration/07-release-to-develop.md)).

## Out of scope

- Fixing bugs found here. They become follow-up stories or PRs.
