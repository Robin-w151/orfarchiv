# 04: PWA service worker on Kit 3

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Claude
**Status:** In progress
**Depends on:** 01, 03
**Size:** S — option A (story 01): a package swap and one import line, then manual verification of the PWA flows

## User story

As a reader who installed ORF Archiv as an app, I want offline fallbacks, update prompts and notifications to keep working after the upgrade, so that the PWA behaves exactly as before.

## Description

Implement option A from [story 01's `## Decision`](01-spike-kit3-compatibility.md#decision): replace `@vite-pwa/sveltekit@1.1.0` with the fork `@katama-labs/vite-pwa-sveltekit@2.0.0`. On Kit 3, 1.1.0 never injects the precache manifest. The fork does (story 01: 49 entries, offline works). The result must keep today's behaviour from `ui/src/service-worker.ts`:

- Precache the build assets (today `precacheAndRoute(self.__WB_MANIFEST)`).
- `NetworkFirst` with a 5 s timeout and `ExpirationPlugin` for `news.search` (max 64, fallback `{ stories: [] }`) and `news.content` (max 256). `NetworkOnly` with fallback `{ updateAvailable: false }` for `news.checkUpdates`. Cache names `api-news-search-v${API_VERSION}` / `api-news-content-v${API_VERSION}`, with old `api-*` caches deleted on `activate`.
- `SKIP_WAITING` message handling (used by `src/lib/utils/updateListener.ts`).
- Notification click/close handling posting `{ type, payload: { id } }` to clients (used by `src/lib/utils/notifications.ts`).
- Web manifest from `src/assets/manifest.ts` linked in `<head>` (today via `pwaInfo` from `virtual:pwa-info` in `src/lib/components/shared/app/AppLayout.svelte`).
- Dev: SW enabled in `npm run dev` (today `devOptions.enabled: true`). The precache is empty in dev and offline navigation doesn't work there, the same as on Kit 2 today (story 01). API caching and the offline API fallback do work.

Changes:

1. In `ui/package.json`: remove `@vite-pwa/sveltekit`, add `@katama-labs/vite-pwa-sveltekit` `2.0.0`, bump `vite-plugin-pwa` `1.3.0` → `2.0.0` (exact versions). Remove the `@vite-pwa/sveltekit` entry from `overrides` (added in story 03). The fork declares peer `@sveltejs/kit ^3.0.0`, so it needs no override. Run `npm install`, then check that a clean `npm ci` passes.
2. In `ui/vite.config.ts` and `ui/vite.storybook.config.ts`: `import { SvelteKitPWA } from '@katama-labs/vite-pwa-sveltekit'`. The plugin options don't change.
3. Leave the service worker's code, `src/assets/manifest.ts` (`ManifestOptions` from `vite-plugin-pwa`), the `virtual:pwa-info` link in `AppLayout.svelte` and `vite-plugin-pwa/info` in tsconfig `types` as they are. They keep working with `vite-plugin-pwa` 2. The SW file moves to `src/service-worker/index.ts` (see Technical notes), and its imports use `#lib/configs/*.ts` like the rest of `src`.
4. Check the build log for `SvelteKit VitePWA v2.0.0`, `mode injectManifest` and `precache N entries` (about 49). Record whether the `transform_index_html_unsupported: vite-plugin-pwa:pwa-assets` warning from story 03 remains.

**Upgrade path for existing installs:** readers and develop.orfarchiv.news already run the Kit 2 / `vite-pwa` service worker. The script URL stays `/service-worker.js` (story 01), so the old SW should update itself to the new one through the normal update flow. Prove that, and record it in `## Verification`.

## Acceptance criteria

- [x] Given `npm run build && npm run preview`, when opening the app in Chromium, then exactly one service worker is registered (DevTools → Application → Service workers), its script is a module, and the precache contains the JS/CSS build assets and the prerendered HTML for `/`, `/bookmarks` and `/settings`.
- [x] Given the app was loaded once, when DevTools is set to Offline and each of `/`, `/bookmarks` and `/settings` is reloaded, then each renders.
- [x] Given the app was loaded once, when DevTools is set to Offline and a search is run, then cached results or the empty-stories fallback appear, without an error page.
- [x] Given `news.checkUpdates` fails (DevTools → Network → right-click a `news.checkUpdates` request → *Block request URL*, then wait for the next poll), then the client receives `{ result: { data: { updateAvailable: false } } }`. _(Verified with a direct offline request instead of the 2 h poll, see `## Verification`.)_
- [x] Given a new build is deployed over an old one in `preview`, when reloading, then the existing update flow (`updateListener.ts`, `SKIP_WAITING`, `controllerchange`) activates the new SW.
- [x] Given `develop` (Kit 2) was built and opened with `npm run preview` so its SW is active, when the Kit 3 build of this branch is served on the same origin and port and the tab is focused, then the existing update prompt appears; after accepting it, exactly one SW (the new one) is registered, the app reloads into the new version, and no stale precache entries from the old SW are served. _(Holds after a one-time second prompt, accepted on 2026-10-20, see `## Verification`.)_
- [x] Given `API_VERSION` changes (temporarily bump it in `src/lib/configs/shared.ts`, rebuild and preview, then check Application → Cache storage; revert afterwards), when the new SW activates, then `api-*` caches with the old version are deleted.
- [ ] Given a notification is shown (in the console: `(await navigator.serviceWorker.ready).showNotification('Test', { data: { id: 'test', path: '/' } })`) and clicked, then the app window is focused and receives the `NOTIFICATION_ACCEPT` message.
- [x] Given the page `<head>`, then a `<link rel="manifest">` resolves to a valid manifest (Chromium "Installable" shows no errors), and the browser console shows no CSP violations.
- [x] Given `npm run lint`, `npm run check`, `npm run test:unit`, `npm run build` and `npm run storybook:build`, then all pass.
- [x] Given `npm run dev` running on port 3001, when running `npm run test:e2e` in a second terminal, then all specs pass.

## Technical notes

- Files: `ui/package.json`, `ui/package-lock.json`, `ui/vite.config.ts`, `ui/vite.storybook.config.ts`, `ui/src/service-worker.ts` → `ui/src/service-worker/index.ts`, `ui/tsconfig.sw.json` → `ui/src/service-worker/tsconfig.json`, `ui/tsconfig.json` (`exclude`), `ui/.github/dependabot.yml` (fork excluded from Dependabot updates).
- Kit 3 builds `src/service-worker/index.ts` itself in a `serviceWorker` Vite environment and registers it. The fork injects the manifest from that environment's `closeBundle` (upstream PR [vite-pwa/sveltekit#111](https://github.com/vite-pwa/sveltekit/pull/111)). Only Kit registers the SW (`serviceWorker.register(…, { type: 'module' })` in the page). The plugin still emits `registerSW.js` (and precaches it), but nothing loads it, so there's one registration.
- The fork is 283 lines (`dist/index.mjs`) with no install scripts. Read through it once when adding it.
- Workbox packages stay (`workbox-core`, `-expiration`, `-precaching`, `-routing`, `-strategies` 7.4.1). `vite-plugin-pwa` 2.0.0 uses `workbox-build` 7.4.1, so revisions remain per-file MD5.
- Fallback if the fork breaks on a later Kit release: option B. Story 01's findings describe the prototype.
- Existing Kit 2 installs show the update prompt twice, once. Kit 2 registered the SW as a classic script and Kit 3 registers it as a module. Changing the registration's `type` counts as an update, so after the first accept and reload a second copy of the same worker installs and waits. Accepted as a one-time effect (decided 2026-10-20), see `## Verification`.
- The triple-slash references (`no-default-lib`, `lib="esnext"`, `lib="webworker"`) are removed, and the SW moved to Kit's documented layout: `src/service-worker/index.ts` with its own `src/service-worker/tsconfig.json` (extends `$app/tsconfig/service-worker`, which sets `lib: ["ESNext", "WebWorker"]`; `"strict": true`; `include: ["."]`). Without the move, the editor wouldn't find a config for the SW (`ui/tsconfig.json` excludes it, and `tsconfig.sw.json` isn't named `tsconfig.json`), so it would fall back to DOM libs and show 12 errors. `check`/`check:watch` run `tsc -p src/service-worker`, and `ui/tsconfig.json` excludes `src/service-worker`. The output stays `/service-worker.js`, so existing clients update as usual.
- Don't set the plugin's `filename`/`srcDir` to the new path. The fork renames its output whenever `filename` isn't `service-worker.js`, and Kit registers `/service-worker.js`, so the SW would 404. The plugin's defaults (`src` + `service-worker.js`) don't match the real source; that's fine, because Kit builds and serves the SW (in dev too).
- Docs: [vite-pwa/sveltekit](https://github.com/vite-pwa/sveltekit), [Workbox precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching).

## Testing

- Manual in Chromium via `npm run preview` (steps in the acceptance criteria). Record the results in this file under `## Verification` so story 06 can repeat them on the Vercel preview.

## Verification

2026-10-20, headless Chromium (Playwright, persistent profile) against `npm run preview` on port 3301. The script lives outside the repo.

- **Build:** `SvelteKit VitePWA v2.0.0`, `mode injectManifest`, `precache 49 entries (2732.20 KiB)` (develop/Kit 2: 48 entries). The `transform_index_html_unsupported: vite-plugin-pwa:pwa-assets` warning is gone: the fork strips `transformIndexHtml` from the plugin. Remaining build warnings are unrelated: Rolldown `SOURCEMAP_BROKEN` for Kit's `vite-plugin-sveltekit-service-worker-env`, and adapter-vercel's optional dependencies of `mongodb`/`jsdom`.
- **Registration:** one registration, scope `/`, active `/service-worker.js`, registered via `serviceWorker.register(…, { type: 'module' })`. `registerSW.js` isn't loaded.
- **Precache:** 49 entries: 26 JS, 4 CSS, icons/screenshots, `manifest.webmanifest`, and `/`, `/bookmarks`, `/settings` with `__WB_REVISION__`.
- **Offline:** `/`, `/bookmarks`, `/settings` → 200 from the SW and render (`/` shows the cached stories). A search that isn't cached returns `{"result":{"data":{"stories":[]}}}`. No error page.
- **`news.checkUpdates` offline:** `{"result":{"data":{"updateAvailable":false}}}`. Tested with a direct `fetch` while offline instead of waiting for the poll (first poll after 2 h).
- **New build over old (Kit 3 → Kit 3, with `API_VERSION` 4 → 5):** after `registration.update()` the prompt "Neue Version verfügbar" appears. *Bestätigen* → `SKIP_WAITING` → `controllerchange` → reload. Afterwards: one registration, no waiting worker, `api-news-search-v4` deleted and `api-news-search-v5` present, 49 precache entries, no stale ones. `API_VERSION` was reverted.
- **Kit 2 → Kit 3 (develop exported with `git archive`, same origin and port):** prompt appears. After the first accept the app reloads into the new version: new entry chunks in the precache, 49 entries, none stale. The same registration then has a second, **waiting** copy of the new worker, because the registration changed from classic to module. That shows the prompt **a second time**. After that accept: one registration, no waiting worker, no further prompt. If the tab is closed instead, the waiting copy activates on the next start and no prompt shows. One-time effect, accepted.
- **Manifest/CSP:** `<link rel="manifest" href="./manifest.webmanifest">` → `ORF Archiv`, `start_url /`, `standalone`, 4 icons. `Page.getInstallabilityErrors` returns `[]`. No CSP violations in the console in any run.
- **Notifications: not verified.** Headless Chromium doesn't grant notification permission (`showNotification` → "No notification permission has been granted"). Calling `onnotificationclick` directly in the SW sends no message, because `client.focus()` is only allowed during a real, user-activated notification click. To check by hand in headed Chromium: preview, allow notifications for `localhost:3301`, run the console command from the criterion, click the notification.
- **Checks:** `lint`, `check` (0 errors, plus `tsc -p src/service-worker`; a deliberate type error in the SW fails it with `TS2322`), `test:unit` (216), `build`, `storybook:build` pass. `test:e2e` against `npm run dev`: 77/77 with `--workers=4`. With the default 7 workers they time out in `waitForTestReady` because the host is saturated (same as story 03). `npm ci` from a clean state passes.
- **After moving the SW to `src/service-worker/index.ts` (2026-10-21):** same build output (`/service-worker.js`, 49 entries, manifest injected), and all offline, manifest and fallback checks above pass again. Pre-move Kit 3 SW → moved build: one prompt, then one registration, no waiting worker, no stale entries. Kit 2 → moved build: same as before the move (one-time second prompt, then clean). Dev: Kit serves `/service-worker.js`, it controls the page, `api-news-search-v4` gets filled, and the offline `checkUpdates` fallback answers.
- **SW imports switched to `#lib/configs/client.ts` / `#lib/configs/shared.ts` (2026-10-21):** `check` passes (a wrong export name fails with `TS2724`, so `tsc -p src/service-worker` resolves `#lib`), the build bundles the same code (`service-worker.js` 26.95 kB as before, 49 entries), and in dev the SW registers, controls the page and fills `api-news-search-v4`.

## Out of scope

- Changing caching strategies or adding new cached routes.
- Switching back to the official `@vite-pwa/sveltekit` once its v2 supports Kit 3 (follow-up outside this epic).
- Testing on real mobile devices (story 06).
