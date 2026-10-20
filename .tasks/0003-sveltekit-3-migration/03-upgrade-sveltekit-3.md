# 03: Upgrade to SvelteKit 3

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** 01, 02
**Size:** L — cross-cutting dependency upgrade. Story 01 mapped the codemod output, but error-page behaviour under Kit 3 is still unverified

## User story

As the maintainer, I want `ui` on `@sveltejs/kit@3.1.x` with all breaking changes addressed, so that the app builds, type-checks and passes its tests on SvelteKit 3.

## Description

Bump SvelteKit and both adapters, run the official codemod, and work through what remains. All steps below were tried in [story 01](01-spike-kit3-compatibility.md#findings). `@vite-pwa/sveltekit@1.1.0` stays for now behind a peer override. It builds, but the service worker's precache is empty until story 04 switches to the fork chosen in story 01's `## Decision`. That's acceptable on the epic branch. Don't delete `src/service-worker.ts`.

Steps:

1. Run `npx sv migrate sveltekit-3 --tasks all --confirm --no-install` and review every change it makes. It also runs `npm run format`.
   - It bumps `package.json` with caret ranges. Re-pin to `@sveltejs/kit` `3.1.0`, `@sveltejs/adapter-vercel` `7.0.1` and `@sveltejs/adapter-node` `6.0.0`. Keep exact versions, as the file does today.
   - It adds `"#lib": "./src/lib/index.js"` to `imports`. That file doesn't exist, so remove the entry and keep story 02's `#lib/*` / `#common/*` mapping.
   - Keep its `resolve('/settings')` → `resolve('settings')` rewrites and the shallow-routing change in `AppLayout.svelte`. In Kit 3, a `resolve()` argument with a leading `/` is a route ID, and one without is a pathname. The rewrites use the pathname form. Use it for every call, including the root: `resolve('/')` → `resolve('')` (decided in review). During SSR and prerendering, Kit renders these as relative hrefs (`./`, `./settings`), the default `paths.relative`.
   - Revert anything else that conflicts with story 02's conventions.
2. **Peer overrides.** Add these entries to `overrides` in `ui/package.json`, next to the existing ones. Without them `npm ci` fails with `ERESOLVE`:
   ```json
   "@vercel/analytics": { "@sveltejs/kit": "$@sveltejs/kit" },
   "@vercel/speed-insights": { "@sveltejs/kit": "$@sveltejs/kit" },
   "@vite-pwa/sveltekit": { "@sveltejs/kit": "$@sveltejs/kit" }
   ```
   The `@vercel/*` overrides stay until those packages declare Kit 3 support. The `@vite-pwa/sveltekit` one is temporary and story 04 removes it. Then run `npm install` and confirm that a clean `npm ci` passes.
   **Codemod TODO list (`MIGRATION_TASKS.md`).** Work through it, then delete the file. Story 01 already triaged it:
   - `Header.svelte` (`page.url` readonly): read-only use, so no change.
   - `StoryAiSummary.svelte` (`goto`/`invalidateAll`): internal route, and no `invalidateAll` there, so no change.
   - `ButtonLink.svelte` (`preloadData`): step 6.
   - `src/service-worker.ts` (`json`): already done in story 02. The SW tsconfig is step 3.
   - CORS and `ORIGIN`: not used, so no change.
3. **tsconfig.** The codemod sets `"extends": "$app/tsconfig"`, `include: ["src", "vite.config.ts", "playwright.config.ts", "tests"]` and `types: ["$app/types", "vite/client", "vite-plugin-pwa/info"]`. It also drops the options `$app/tsconfig` now provides, including `allowImportingTsExtensions`; `.ts` imports still type-check without it (story 01). Add `"exclude": ["src/service-worker", "src/service-worker.ts"]` to silence the build warning `tsconfig_invalid: "src/service-worker" should be added to the "exclude" array`. Add a service-worker tsconfig extending `$app/tsconfig/service-worker`. While the SW is still the single file `src/service-worker.ts`, use `tsconfig.sw.json` at the root (`files: ["src/service-worker.ts"]`); story 04 moves it if the SW moves into `src/service-worker/`. Extend the `check` script so it also type-checks the service worker: `… && tsc -p tsconfig.sw.json --noEmit`.
4. **`vite.config.ts`.** Remove `experimental.explicitEnvironmentVariables` (removed in Kit 3; `check` fails on it). Replace `import type { KitConfig } from '@sveltejs/kit'` / `KitConfig['csp']` with `import type { Config } from '@sveltejs/kit/vite'` / `Config['csp']`. Keep `csp`, `adapter`, `preprocess`, `compilerOptions.experimental.async`. The `alias` blocks are already gone (story 02).
5. **Error page.** `src/routes/+error.svelte` throws `error(404)` for `/favicon.ico` and `redirect(302, '/')` for everything else during render. Verify this still works under Kit 3's error boundaries. If not, move the logic to `src/hooks.server.ts` (`handle`: unknown route → 302 to `/`, `/favicon.ico` → 404). Keep `+error.svelte` as a minimal fallback.
6. **`preloadData`.** In `src/lib/components/shared/controls/ButtonLink.svelte`, make sure a `{ type: 'error' }` result doesn't cause an unhandled rejection or a console error.
7. **Scripts.** `svelte-kit sync` still exists on Kit 3 (story 01), so `check`, `check:watch`, `prepare`, the Dockerfile and CI only change for the service worker's `tsc` step from step 3.
8. **Storybook.** The static build (deployed to GitHub Pages) fails every story on Kit 3 with `__SVELTEKIT_PAYLOAD__ is not defined`. Dev mode works. Add this to `vite.storybook.config.ts` (story 01's prototype; no package change):
   ```ts
   define: {
     __SVELTEKIT_PAYLOAD__: 'undefined',
   },
   ```
   Disabling `storybook.yaml` or individual stories isn't an option.
9. **Sonda.** `sonda/sveltekit@0.14.0` works on Kit 3 unchanged. It now writes one `sonda_client_N.html` per Vite environment instead of client + server, which is cosmetic.
10. Update `package-lock.json` via `npm install` (plain npm, because of the safe-chain wrapper).

## Acceptance criteria

- [x] Given `ui/package.json`, then `@sveltejs/kit` is `3.1.x`, `@sveltejs/adapter-vercel` is `7.x` and `@sveltejs/adapter-node` is `6.x`.
- [x] Given a clean `node_modules`, when running `npm ci`, then it passes without `ERESOLVE`.
- [x] Given the branch, when running `npm run lint`, `npm run check`, `npm run test:unit` and `npm run build`, then all pass with no SvelteKit deprecation warnings and no `tsconfig_invalid` warning in the output.
- [x] Given `npm run dev` running on port 3001, when running `npm run test:e2e` in a second terminal, then all specs pass.
- [x] Given a type error added to the service worker, when running `npm run check`, then it fails.
- [x] Given `npm run storybook:build`, then it passes.
- [x] Given `storybook-static` served statically (e.g. `python3 -m http.server -d storybook-static`) and `npm run storybook`, when opening each of the 21 stories (17 files under `src/stories/**`), then each renders without errors and with no console errors about unresolved `$app/*` or `#lib/*` modules or `__SVELTEKIT_PAYLOAD__`. Known noise also present on `develop`: an external image `ERR_NAME_NOT_RESOLVED` in `StoryContent` when offline, and Storybook's implicit-action deprecation in `controls-input--input`.
- [x] Given `npm run dev`, when visiting `/does-not-exist`, then the browser ends up on `/` (302). When requesting `/favicon.ico` with no static file, then the response is 404.
- [x] Given `/` with a search term entered and the list scrolled down, when clicking the header title (`Header.svelte`, `href={resolve('')}`), then the search term, the scroll position and the tRPC requests in DevTools → Network match the same steps on `develop` (checked side by side), and no request repeats more than once.
- [x] Given `ButtonLink` with an `href` whose preload fails, when hovering it, then no unhandled promise rejection is logged.
- [x] Given `ui/tsconfig.json`, then it extends `$app/tsconfig`, and the service worker is type-checked by its own tsconfig.
- [x] Given `npm run build` with the Vercel adapter, then `.vercel/output` is produced and every `.vercel/output/functions/**/.vc-config.json` has `"runtime": "nodejs…"` (none `edge`), including the one for the tRPC route `src/routes/api/trpc/[...procedure]/+server.ts`.

## Technical notes

- Files: `ui/package.json`, `ui/package-lock.json`, `ui/vite.config.ts`, `ui/vite.storybook.config.ts`, `ui/tsconfig.json`, new `ui/tsconfig.sw.json`, `ui/src/routes/+error.svelte`, possibly a new `ui/src/hooks.server.ts`, `ui/src/lib/components/shared/controls/ButtonLink.svelte`, plus whatever the codemod touches (`AppLayout.svelte`, the 8 `resolve()` call sites, all in pathname form).
- Expected build warning: `transform_index_html_unsupported: vite-plugin-pwa:pwa-assets`. It's Kit flagging a plugin hook, not a deprecation, so it doesn't fail the warnings criterion. Story 04 checks whether it remains with the fork.
- Already compliant, no work expected (check that the codemod leaves them alone): `$app/env*`, `$app/state`, `resolve` from `$app/paths`, `defineEnvVars` from `@sveltejs/kit/env` (`src/env.ts`), `RequestHandler`/`RequestEvent` types from `@sveltejs/kit`.
- Server-only rule: `src/lib/configs/server.ts` is only imported from `src/lib/backend/**`. The client imports `AppRouter` via `import type` (`src/lib/api/*.ts`), which is erased. If the build complains anyway, it's a real leak and must be fixed, not suppressed.
- CSRF is always on. The tRPC client posts same-origin with `content-type: application/json`, so no `csrf.trustedOrigins` is needed.
- `App.Error` now always includes `status`. `src/app.d.ts` declares no custom `Error`, so nothing changes.
- E2E: Playwright has no `webServer` and defaults to `http://localhost:3001` (`TEST_BASE_URL` overrides it). In CI, `test.yaml` runs e2e only on Vercel `deployment_status`, i.e. against the deployed preview.
- `version.pollInterval` now defaults to 1 hour. The app has its own SW-based update detection (`src/lib/utils/updateListener.ts`), so no config is needed.

## Testing

- Existing suites. Add a Playwright spec for the unknown-route → `/` redirect if `+error.svelte` logic moves into a hook.
- Manual: `npm run dev`, run a search and a semantic search, open a story's content, bookmark it, open settings.

## Out of scope

- Switching to the Kit 3 PWA plugin fork and restoring the precache (story 04).
- Dockerfile and adapter-node runtime (story 05).
- A CI check that renders the Storybook stories, so the `__SVELTEKIT_PAYLOAD__` fix can't silently regress (story 08).

## Verification notes

Run on 2026-10-20 in the devcontainer, Node 24, on `feat/sveltekit-3` (uncommitted).

- `rm -rf node_modules && npm ci`: passes, no `ERESOLVE`. `npm ls`: kit 3.1.0, adapter-node 6.0.0, adapter-vercel 7.0.1.
- `lint` ✅, `check` ✅ (0 errors, 1326 files, plus `tsc -p tsconfig.sw.json`), `test:unit` ✅ (216), `build` ✅, `storybook:build` ✅. No deprecation and no `tsconfig_invalid` warnings. The only Kit warning is the expected `transform_index_html_unsupported`. The build also prints Rolldown's `SOURCEMAP_BROKEN` for Kit's own `vite-plugin-sveltekit-service-worker-env`, which isn't a deprecation.
- A type error appended to `src/service-worker.ts` makes `check` fail (`TS2322`).
- Vercel output: a single function `.vercel/output/functions/![-]/catchall.func` (`"runtime": "nodejs24.x"`), which also serves `api/trpc/[...procedure]`. No `edge` runtime.
- Error page: `+error.svelte` still works on Kit 3. `/does-not-exist` → 302 to `/` (curl and browser), `/favicon.ico` → 404. No hook needed, so no new spec.
- `ButtonLink`: `preloadData(href).catch(() => undefined)`. Kit 3 returns `{ type: 'error' }` for load failures, but throws `preload_url_outside_app` for hrefs outside the app. Hovering the settings link with its route chunk blocked logs no `pageerror` (unhandled rejection). Kit's default client `handleError` still logs the failed dynamic import to the console, identically on Kit 2.
- Header title on `/` (search `wien`, scrolled 2500 px, click title), Kit 3 vs Kit 2 (story 02 `HEAD` in a detached worktree), headless: identical. Both end on `/` with the search term kept, `scrollY` 0, no tRPC requests after the click and no new console errors.
- Storybook: all 21 stories render in `storybook-static` and in `npm run storybook`, with only the known noise (2× `ERR_NAME_NOT_RESOLVED` in `StoryContent`, the implicit-action deprecation in `controls-input--input`).
- E2E: 77/77 with `--workers=4` on a warm dev server, on Kit 3 and on the Kit 2 baseline alike. With the default 7 workers both versions time out in `waitForTestReady` (Kit 2: 77 failed, Kit 3: 7–56 failed) because the host was saturated (load average 45–60 on 14 cores). Single failing specs pass in isolation, so this is environment load, not a Kit 3 regression.

