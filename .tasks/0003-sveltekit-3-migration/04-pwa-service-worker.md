# 04: PWA service worker on Kit 3

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Claude
**Status:** Todo
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
3. Leave `src/service-worker.ts`, `src/assets/manifest.ts` (`ManifestOptions` from `vite-plugin-pwa`), the `virtual:pwa-info` link in `AppLayout.svelte` and `vite-plugin-pwa/info` in tsconfig `types` as they are. They keep working with `vite-plugin-pwa` 2.
4. Check the build log for `SvelteKit VitePWA v2.0.0`, `mode injectManifest` and `precache N entries` (about 49). Record whether the `transform_index_html_unsupported: vite-plugin-pwa:pwa-assets` warning from story 03 remains.

**Upgrade path for existing installs:** readers and develop.orfarchiv.news already run the Kit 2 / `vite-pwa` service worker. The script URL stays `/service-worker.js` (story 01), so the old SW should update itself to the new one through the normal update flow. Prove that, and record it in `## Verification`.

## Acceptance criteria

- [ ] Given `npm run build && npm run preview`, when opening the app in Chromium, then exactly one service worker is registered (DevTools → Application → Service workers), its script is a module, and the precache contains the JS/CSS build assets and the prerendered HTML for `/`, `/bookmarks` and `/settings`.
- [ ] Given the app was loaded once, when DevTools is set to Offline and each of `/`, `/bookmarks` and `/settings` is reloaded, then each renders.
- [ ] Given the app was loaded once, when DevTools is set to Offline and a search is run, then cached results or the empty-stories fallback appear, without an error page.
- [ ] Given `news.checkUpdates` fails (DevTools → Network → right-click a `news.checkUpdates` request → *Block request URL*, then wait for the next poll), then the client receives `{ result: { data: { updateAvailable: false } } }`.
- [ ] Given a new build is deployed over an old one in `preview`, when reloading, then the existing update flow (`updateListener.ts`, `SKIP_WAITING`, `controllerchange`) activates the new SW.
- [ ] Given `develop` (Kit 2) was built and opened with `npm run preview` so its SW is active, when the Kit 3 build of this branch is served on the same origin and port and the tab is focused, then the existing update prompt appears; after accepting it, exactly one SW (the new one) is registered, the app reloads into the new version, and no stale precache entries from the old SW are served.
- [ ] Given `API_VERSION` changes (temporarily bump it in `src/lib/configs/shared.ts`, rebuild and preview, then check Application → Cache storage; revert afterwards), when the new SW activates, then `api-*` caches with the old version are deleted.
- [ ] Given a notification is shown (in the console: `(await navigator.serviceWorker.ready).showNotification('Test', { data: { id: 'test', path: '/' } })`) and clicked, then the app window is focused and receives the `NOTIFICATION_ACCEPT` message.
- [ ] Given the page `<head>`, then a `<link rel="manifest">` resolves to a valid manifest (Chromium "Installable" shows no errors), and the browser console shows no CSP violations.
- [ ] Given `npm run lint`, `npm run check`, `npm run test:unit`, `npm run build` and `npm run storybook:build`, then all pass.
- [ ] Given `npm run dev` running on port 3001, when running `npm run test:e2e` in a second terminal, then all specs pass.

## Technical notes

- Files: `ui/package.json`, `ui/package-lock.json`, `ui/vite.config.ts`, `ui/vite.storybook.config.ts`, `ui/src/service-worker.ts` (triple-slash references).
- Kit 3 builds `src/service-worker.ts` itself in a `serviceWorker` Vite environment and registers it. The fork injects the manifest from that environment's `closeBundle` (upstream PR [vite-pwa/sveltekit#111](https://github.com/vite-pwa/sveltekit/pull/111)). Kit's registration and the plugin's `registerSW.js` target the same URL, so there's only one registration.
- The fork is 283 lines (`dist/index.mjs`) with no install scripts. Read through it once when adding it.
- Workbox packages stay (`workbox-core`, `-expiration`, `-precaching`, `-routing`, `-strategies` 7.4.1). `vite-plugin-pwa` 2.0.0 uses `workbox-build` 7.4.1, so revisions remain per-file MD5.
- Fallback if the fork breaks on a later Kit release: option B. Story 01's findings describe the prototype.
- Remove the triple-slash references at the top of `ui/src/service-worker.ts` (`no-default-lib`, `lib="esnext"`, `lib="webworker"`). `ui/tsconfig.sw.json` (story 03) extends `$app/tsconfig/service-worker`, which already sets `lib: ["ESNext", "WebWorker"]`. `npm run check` must still pass afterwards. If the service worker moves into `src/service-worker/`, move `tsconfig.sw.json` with it (as `src/service-worker/tsconfig.json`, keeping `"strict": true`) and update the `check`/`check:watch` scripts and the `exclude` in `ui/tsconfig.json`.
- Docs: [vite-pwa/sveltekit](https://github.com/vite-pwa/sveltekit), [Workbox precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching).

## Testing

- Manual in Chromium via `npm run preview` (steps in the acceptance criteria). Record the results in this file under `## Verification` so story 06 can repeat them on the Vercel preview.

## Out of scope

- Changing caching strategies or adding new cached routes.
- Switching back to the official `@vite-pwa/sveltekit` once its v2 supports Kit 3 (follow-up outside this epic).
- Testing on real mobile devices (story 06).
