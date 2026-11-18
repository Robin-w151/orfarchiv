# 02: Subpath imports on Kit 2

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** 01
**Size:** M — ~130 files, but mechanical and scriptable; risk is in tooling (svelte-check, Storybook, Playwright) resolving `#lib`

## User story

As the maintainer, I want all `$lib`/`$common` imports replaced by package.json subpath imports while still on Kit 2, so that the SvelteKit 3 upgrade diff only contains the real breaking changes.

## Description

SvelteKit 3 no longer generates the `$lib` alias. The replacement is Node subpath imports declared in `ui/package.json`. Vite 8 and TypeScript 6 already resolve these, so the switch can land on Kit 2.70.3.

Changes:

1. Add to `ui/package.json` (convention confirmed in story 01's findings):

   ```json
   "imports": {
     "#lib/*": "./src/lib/*",
     "#common/*": "./src/lib/shared/common/src/*"
   }
   ```

   Don't add a bare `"#lib"` entry. There's no `src/lib/index.ts` and no directory imports (story 01).
2. Rewrite every `'$lib/…'` import to `'#lib/…'`, with an explicit file extension (`.ts`, `.svelte`, `.svelte.ts`, `.js`). Imports that point at a directory become `…/index.ts`.
   - Two existing imports already point at `.ts` files with a `.js` extension: `StoryHeader.svelte` → `utils/datetime.js` and `Sources.svelte` → `models/settings.js`. They become `#lib/utils/datetime.ts` and `#lib/models/settings.ts`.
   - Covers `ui/src/**`, `ui/tests/**` (`tests/specs/news.spec.ts`), `vi.mock('$lib/…')` and `importOriginal<typeof import('$lib/…')>` in specs (e.g. `src/lib/backend/search/semantic.spec.ts`), and any `.storybook` or `src/stories` files.
3. Rewrite the 9 `$common/…` imports to `#common/…` with an explicit extension (e.g. `#common/targets/targets.ts`), the same convention as `#lib`. This deliberately differs from `scraper` and `db`, which put `.ts` in the mapping and import without an extension: within `ui`, every subpath import looks the same.
4. Remove the `alias` block (`$assets`, `$common`, `$lib`) and the then-unused `import { resolve } from 'node:path'` from `ui/vite.config.ts` and `ui/vite.storybook.config.ts`. `$assets` has no usages. Kit 2 still generates `$lib` itself, so a leftover `$lib` import would still compile. The acceptance-criteria grep is what catches it.
5. In `ui/src/service-worker.ts`, replace `import { json } from '@sveltejs/kit'` / `json({...})` with `Response.json({...})`. Keep the relative `./lib/configs/*` imports in `src/service-worker.ts` unchanged; story 04 owns the service worker.

Use the rewrite script from [story 01's findings](01-spike-kit3-compatibility.md#2-lib-with-ts-extensions), run from the scratchpad and not committed. In the spike it rewrote 456 specifiers in 130 files. Afterwards run `npx prettier --write .` (one line in `backend/search/keyword.ts` gets too long). Don't use `sv migrate`: its `lib-alias` task emits `.js` extensions, skips `$common` and expects Kit 3.

## Acceptance criteria

- [x] Given `ui/`, when running `grep -rnE '\$(lib|common|assets)/' src tests .storybook --exclude-dir=common`, then there are no matches.
- [x] Given `ui/vite.config.ts` and `ui/vite.storybook.config.ts`, then neither contains an `alias` entry for `$lib`, `$common` or `$assets`.
- [x] Given `ui/src/service-worker.ts`, then it doesn't import from `@sveltejs/kit`, and the offline fallback still returns `{ result: { data } }` as JSON with `content-type: application/json`.
- [x] Given the branch, when running `npm run lint`, `npm run check`, `npm run test:unit`, `npm run build` and `npm run storybook:build`, then all pass.
- [x] Given `npm run dev` running on port 3001, when running `npm run test:e2e` in a second terminal, then all specs pass.
- [x] Given `npm run dev`, when opening `/`, `/bookmarks` and `/settings`, then each page renders without console errors.
- [x] Given `(export PUBLIC_APP_MODE=invalid && npm run build)`, then the build fails with the env schema error from `src/env.ts`, proving the file still loads and validates with its `#lib` import.
- [x] `@sveltejs/kit` stays at `2.70.3` in this story.

## Technical notes

- Files: `ui/package.json`, `ui/vite.config.ts`, `ui/vite.storybook.config.ts`, `ui/src/service-worker.ts`, ~130 files under `ui/src/**`, `ui/tests/specs/news.spec.ts`.
- `ui/tsconfig.json` already has `allowImportingTsExtensions: true`. Story 01 confirmed that svelte-check resolves `#lib` through package.json `imports` on Kit 2 (0 errors).
- `src/env.ts` imports `#lib/models/checks.ts`. Kit loads this file for env validation, possibly outside the normal Vite module graph, so check that it resolves in `svelte-kit sync`, `dev`, `build` and under Vitest. The env override runs in an exported subshell rather than as `env …`, so npm still goes through the safe-chain wrapper.
- ESLint ignores `src/lib/shared/common/`. Don't modify the nested `shared` submodule.
- E2E on a cold dev server: the first run can time out on 6 `news.spec.ts` "Search" specs. This already happens on `develop`, caused by a Vite dep-scan error (`"./elements" is not exported … from package svelte`, from `AccessibleTransition.svelte`). Rerun on the warm server. A fresh devcontainer may also need `npx playwright install chromium` first.
- Import ordering: Prettier/ESLint don't sort imports today, so the rewrite doesn't reorder anything.
- Branch: `feat/sveltekit-3` in `ui`, branched from `develop` (created by Claude at the user's request).

## Findings

- Rewrite script: 456 specifiers in 130 files, plus the two `.js` → `.ts` fixes by hand. Prettier reformatted 4 more files.
- Invalid env build: `npm run build` fails, but the `@vite-pwa/sveltekit` `closeBundle` error (`The 'swSrc' file can't be read`) hides the real error, because the SSR build aborts before the service worker is emitted. A build without the PWA plugin shows `Invalid environment variables … PUBLIC_APP_MODE - Expected "dev" | "prod"`. This comes from the plugin and isn't caused by the import change. Story 04 replaces the plugin.
- E2E: with the default 14 workers in the devcontainer (16 GB, swap full), many specs time out waiting for `data-test=ready` and a page crashed. `npm run test:e2e -- --workers=4` passes 77/77 in ~50 s.
- Console: the only error on `/`, `/bookmarks` and `/settings` is `EasySpeech: browser has no voices (timeout)`, from headless Chromium having no TTS voices.
- Mocks: replacing `vi.mock` with the non-hoisted `vi.doMock` makes `news.spec.ts`, `semantic.spec.ts` and `database.spec.ts` fail. `ai.spec.ts` only silences the logger, so its factory was made to throw instead, and the throw was hit.

## Testing

- The existing unit, e2e and Storybook suites are the regression net. No new tests needed.
- Check that every rewritten `vi.mock('#lib/…')` (`news.spec.ts`, `semantic.spec.ts`, `database.spec.ts`, `ai.spec.ts`) still intercepts its module, e.g. by temporarily breaking the mock and seeing the test fail.

## Out of scope

- Bumping SvelteKit (story 03).
- Moving `src/service-worker.ts` to `src/service-worker/index.ts` (story 04).
