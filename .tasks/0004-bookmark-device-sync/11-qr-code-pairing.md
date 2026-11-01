# 11: QR code pairing

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 10
**Size:** M — QR rendering plus an in-app camera scanner, with a new dependency, a Permissions-Policy change and browser differences (`BarcodeDetector` support)

## User story

As a user, I want to show a QR code on one device and scan it with another, so that pairing phone↔phone or desktop↔phone takes seconds and also works for the installed iOS app.

## Description

**Show QR:**

- In the "Gerät hinzufügen" area of the sync section (story 10): button "QR-Code anzeigen" → `Modal` with the pairing link (`${origin}/settings#sync=<secret>`) as a QR code (SVG, error correction M, at least 240 px, white quiet zone, so it still scans in dark mode) and the caption "Mit dem anderen Gerät scannen".
- The QR is generated on the device. The secret is never sent to a QR service.

**Scan QR:**

- In both the "sync off" and "sync on" states: button "QR-Code scannen" → `Modal` with a live camera preview (`getUserMedia({ video: { facingMode: 'environment' } })`).
- Decoding uses `BarcodeDetector` (`formats: ['qr_code']`) where supported, otherwise a JS decoder fallback library.
- On the first decoded value: stop the camera, parse it with the fragment parser from story 10 (it must be a link with `#sync=` for **any** origin of this app, or a bare UUID), then go through the same confirmation flow as link pairing.
- A value that isn't a pairing code → inline hint "Kein ORF-Archiv-Code", and scanning continues.
- Errors: permission denied → "Kamerazugriff verweigert" with a hint to use the link or manual entry. No camera or `getUserMedia` unavailable → hide the scan button.
- Always stop all tracks when the modal closes, the page is hidden or the component is destroyed.

**Headers:**

- [ui/vercel.json](../../ui/vercel.json) `Permissions-Policy`: change `camera=()` to `camera=(self)`. Check whether the Docker/node deployment sets any headers of its own (grep found only `vercel.json`).
- CSP: `img-src` already allows `data:`, so the QR as inline SVG needs no change. If the decoder library uses a Web Worker or WASM, check `script-src` / `worker-src` and prefer a pure-JS build that needs no CSP change.

## Acceptance criteria

- [ ] Given sync is on, when clicking "QR-Code anzeigen", then a QR code is shown that decodes to `https://<origin>/settings#sync=<secret>` (checked in a unit test by decoding the generated SVG/matrix).
- [ ] Given the phone's camera app scans it, then the browser opens the settings page and the pairing dialog appears.
- [ ] Given the in-app scanner reads a valid code, then the camera stops and the pairing confirmation from story 10 appears.
- [ ] Given a non-pairing QR code, then a hint is shown and scanning continues.
- [ ] Given the camera permission is denied, then a clear message is shown and no error escapes to the console.
- [ ] Given the modal is closed, then `MediaStreamTrack.readyState` is `ended` for all tracks.
- [ ] The production `Permissions-Policy` header contains `camera=(self)`, and the camera stays blocked for third-party frames.
- [ ] `uqr` and `jsqr` are added as dependencies, pinned to exact versions, at least 48 h old (safe-chain), and the bundle size increase is reported in the PR (Sonda).

## Technical notes

- **QR generation: `uqr`** (UnJS). Zero dependencies, ESM with TypeScript types, and it works without canvas or DOM. Use `encode(link, { ecc: 'M', border: 2 })` to get the module matrix and render it as one `<path>` in a Svelte `<svg>`. This avoids `{@html}` and stays inside the current CSP. Considered: `qrcode-generator` (older, CommonJS), `qrcode` (pulls in canvas/Node deps).
- **QR scanning: native `BarcodeDetector` first, `jsqr` as fallback.** `BarcodeDetector` is available in Chrome on Android and macOS, but not in Safari, Firefox or Chrome on Windows/Linux. So `jsqr` is the main path on iOS, which matters most here because of the PWA storage separation. `jsqr` is pure JS with no dependencies, decodes `ImageData` drawn from a `<canvas>` frame, and needs no worker or WASM, so no CSP change. It's stable but hasn't had a release in years. That's acceptable for a large, high-contrast QR code on a screen. Load it with `import()` only when `BarcodeDetector` is missing, so it stays out of the main bundle. Scan about 8 frames per second, downscaled to at most 640 px on the long side.
- Considered for scanning: the `barcode-detector` polyfill (backed by `zxing-wasm`; better on damaged or angled codes, but ~1 MB of WASM that loads from a CDN by default, which means CSP and self-hosting work), `qr-scanner` (worker-based, unmaintained), and `html5-qrcode` (heavy, ships its own UI). Switch to the `barcode-detector` polyfill only if story 12 shows `jsqr` failing on real devices.
- New: `ui/src/lib/components/settings/sync/SyncQrCode.svelte`, `SyncQrScanner.svelte`, `ui/src/lib/utils/qr.ts`.
- Install through `npm` in `ui` directly (not through `timeout`/`env` wrappers).

## Testing

- Unit: QR round trip (generate → decode with the fallback decoder), pairing-value parser `it.each` (link, bare UUID, foreign URL, garbage).
- E2E: Chromium with `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<y4m with QR>` if practical. Otherwise mock `getUserMedia` / `BarcodeDetector` in the page, and leave real camera checks to story 12.
- Storybook: QR modal story.

## Out of scope

- Real-device scanning across phones (story 12).
