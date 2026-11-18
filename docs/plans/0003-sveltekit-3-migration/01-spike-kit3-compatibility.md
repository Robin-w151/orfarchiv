# 01: Spike: Kit 3 compatibility

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** –
**Size:** L — throwaway, but seven integration questions plus prototyped fixes for Storybook and possibly the PWA; outcome unknown

## User story

As the maintainer, I want to know which integrations break on SvelteKit 3 before planning the real upgrade, so that stories 03 and 04 have the right scope and the PWA approach is decided on evidence.

## Description

Install Kit 3 on a scratch copy of `ui`, run the official codemod, and try every build and tool the project uses. Nothing from this story is merged. The output is a findings section appended to this file, plus a decision for story 04.

Questions to answer:

1. **Codemod.** What does `npx sv migrate sveltekit-3 --tasks all --confirm` change, and what's on its generated TODO list? Does it rewrite `$lib` → `#lib` (including the custom `$common` alias)? Does it add extensions? Does it handle `vite.storybook.config.ts`?
2. **`#lib` with `.ts` extensions.** Do imports like `#lib/models/checks.ts` with `"#lib/*": "./src/lib/*"` work in `vite build`, `vite dev`, `svelte-check`, Vitest, Playwright (`tests/specs/news.spec.ts`) and Storybook? Or must they be `.js`? Does the same mapping work on **Kit 2.70.3** (input for story 02)?
3. **Config options.** Do `alias`, `experimental.explicitEnvironmentVariables` and `csp` still exist in the `sveltekit()` plugin options? Does the `svelte-kit sync` CLI still exist (used in the `check`/`prepare` scripts, the Dockerfile and CI)?
4. **PWA.** With `@vite-pwa/sveltekit@1.1.0` (or a newer version if one exists by then: `npm view @vite-pwa/sveltekit versions`), does `npm run build` produce a service worker with the injected Workbox manifest? Does Kit 3 also register its own service worker, so there are two? Does `virtual:pwa-info` still resolve? Check the plugin's GitHub issues/PRs for Kit 3 support.
   If only the install fails (npm `ERESOLVE` on the plugin's `@sveltejs/kit ^1.3.1 || ^2.0.1` peer), add an npm override to `ui/package.json` next to the existing `overrides` and test the plugin with it:

   ```json
   "overrides": {
     "@vite-pwa/sveltekit": { "@sveltejs/kit": "$@sveltejs/kit" }
   }
   ```

   Record in the findings that the override is needed, the exact entry, and whether build, dev and the service worker work with it. If they do, option A counts as viable with the override, and story 04 keeps the override until the plugin declares Kit 3 support.
   If option A isn't viable:
   - List exactly what `$app/service-worker` and `$app/manifest` export in the installed version (`build`, `files`, `prerendered`, `version`, or anything else), and whether that's enough for a revisioned Workbox precache list (option B).
   - Check whether Kit 3 still has an option to disable its automatic service worker registration (needed for option C).
   - Prototype the cheapest viable option far enough to see exactly one service worker registered with a populated precache.

5. **Storybook (must work).** Storybook is deployed to GitHub Pages from `develop` (`.github/workflows/storybook.yaml`), so a broken Storybook blocks the epic. Check:
   - Do `npm run storybook:build` and `npm run storybook` work with `@storybook/sveltekit@10.6.2`? Is there a newer version with Kit 3 support (`npm view @storybook/sveltekit versions`, Storybook GitHub issues/changelog)?
   - Does every one of the 17 stories in `src/stories/**` render without errors in the browser? Many of them render real components that import `$app/env` (`browser`), `$app/env/public`, `$app/state` and `$app/paths`. Does `@storybook/sveltekit` mock these new Kit 3 modules, or do they fail to resolve at runtime?
   - Does `#lib/*` resolve in `vite.storybook.config.ts` (builder-vite reads `package.json` `imports`)?
   - If anything is broken, **prototype a working fix** in the spike and record it exactly. Options in order of preference: a newer `@storybook/sveltekit`, Storybook's `sveltekit_experimental` parameters / `viteFinal` aliases that mock the missing `$app/*` modules (e.g. `.storybook/mocks/app-env.ts`), or switching `.storybook/main.js` to `@storybook/svelte-vite` with explicit mocks. Only stop and ask the user if none of these works.
6. **Sonda.** Does `sonda/sveltekit` still work in `vite.config.ts`?
7. **Adapters.** Do `npm run build` (Vercel) and `USE_ADAPTER_NODE=true npm run build` (Node) succeed? What does `build/` look like for adapter-node 6 (is `node_modules` still needed at runtime)?

**PWA decision** (the user decides): once the findings are written, present the viable options with their evidence and a recommendation to the user, and wait for their choice before writing the `## Decision` section or changing other stories.

- **A — keep the plugin:** a Kit-3-compatible `@vite-pwa/sveltekit` exists, or 1.1.0 works with a small config change and, if needed, the peer-dependency override.
- **B — native Kit service worker:** drop `@vite-pwa/sveltekit`. Kit builds `src/service-worker/index.ts`, and Workbox precaching gets the asset list from Kit (`$app/service-worker`/`$app/manifest`) instead of `self.__WB_MANIFEST`. The web manifest (`src/assets/manifest.ts`) and the `pwaInfo` head tags are emitted another way.
- **C — `vite-plugin-pwa` directly** with Kit's own service worker registration turned off, if Kit 3 allows that.

## Acceptance criteria

- [x] Given the spike is done, then this file has a `## Findings` section that answers questions 1–7, each with the command run and the observed result (error excerpts where relevant).
- [x] Given the findings, when the user has chosen PWA option A, B or C (asked before anything is written), then a `## Decision` section records their choice and why, and stories 02–05 are updated where the findings change their scope (steps, Technical notes, sizes), with the README table, size overview and diagram kept in sync.
- [x] Given question 5, then the findings either show Storybook building and every story rendering on Kit 3 as is, or describe a prototyped fix that achieves this (exact package versions and config changes), so that story 03 can apply it.
- [x] Given question 2, then the import-path convention for story 02 (`.ts` vs `.js` extensions, index imports) is stated.
- [x] Given question 3, then the epic's "Risks & open questions" entries on `alias`, `explicitEnvironmentVariables` and `svelte-kit sync` are resolved (marked answered in the README).
- [x] No changes are committed or pushed to any `ui` branch. The scratch copy lives outside the repo (for example a git worktree or a copy in the scratchpad) and is deleted afterwards.

## Technical notes

- Scratch setup (tested on 2026-10-20 in the devcontainer with git 2.47.3). Run it in the devcontainer, with a real path, e.g. a folder in Claude's scratchpad or `/tmp/ui-kit3`:

  ```sh
  git -C /workspaces/orfarchiv/ui worktree add --detach /tmp/ui-kit3 develop
  cd /tmp/ui-kit3 && git submodule update --init && npm ci
  # … spike …
  git -C /workspaces/orfarchiv/ui worktree remove --force /tmp/ui-kit3
  ```

  - `--detach` is required. `develop` is already checked out in `ui`, and git allows a branch in only one worktree. Detached also means no branch is moved or created.
  - `git submodule update --init` fills the nested `src/lib/shared/common`, which a new worktree leaves empty.
  - `--force` is required on removal. Git refuses to remove any worktree that contains an initialised submodule ("working trees containing submodules cannot be moved or removed"), even without changes. The removal deletes the folder and git's record of it.
  - `.env` is tracked, so the worktree already has it (`USE_ADAPTER_NODE=false`, `DISABLE_CSP=false`).

- npm and npx are safe-chain wrappers, so run `npm ci` and `npx sv migrate sveltekit-3 …` plainly (no `timeout`/`env`/`xargs` wrappers). `npm ci` also runs the `prepare` script (`husky && npx svelte-kit sync`) in the worktree, which is expected.
- Bump in the scratch copy: `@sveltejs/kit@3.1.0`, `@sveltejs/adapter-node@6.0.0`, `@sveltejs/adapter-vercel@7.0.1`.
- Files to watch: `ui/vite.config.ts`, `ui/vite.storybook.config.ts`, `ui/vitest.config.ts`, `ui/tsconfig.json`, `ui/src/service-worker.ts`, `ui/src/lib/components/shared/app/AppLayout.svelte` (`virtual:pwa-info`), `ui/.storybook/main.js`.
- Peer deps today: `@vite-pwa/sveltekit@1.1.0` → `@sveltejs/kit ^1.3.1 || ^2.0.1`. `@storybook/sveltekit@10.6.2` has no Kit peer.
- Docs: [migration guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3), [service workers](https://svelte.dev/docs/kit/service-workers), [vite-pwa/sveltekit](https://github.com/vite-pwa/sveltekit).

## Testing

- Run every script in `ui/package.json` that CI runs (`lint`, `check`, `test:unit`, `build`, `storybook:build`) plus `test:e2e`, and record pass/fail per script.
- `npm run storybook`, then open every story in the sidebar and record any that fail to render or log console errors.
- `npm run preview`, then in Chromium DevTools → Application → Service workers: check exactly one SW is registered and that the precache is populated.

## Out of scope

- Fixing anything properly. That's stories 02–05.

## Findings

Spike run on 2026-10-20 in two detached worktrees of `ui` `develop` @ `3290c2a` (one Kit 3 scratch copy, one untouched Kit 2 reference), both deleted afterwards. Node 24.15.0, npm via safe-chain. Nothing was committed. Browser checks used headless Chromium through Playwright scripts in the scratchpad. One script opens every story in `index.json` and collects page errors. The other loads `/` on `vite preview`, reloads, reads `getRegistrations()` and the Cache Storage, and then loads `/` and `/settings` offline.

Environment note: the devcontainer had no browser build for Playwright 1.64.1. `npx playwright install chromium` was needed before `test:e2e` would run. The same happens on a fresh container.

### Baseline (Kit 2.70.3, unmodified)

| Script                                                   | Result                                                                                                                                                                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint`, `check`, `test:unit`, `build`, `storybook:build` | pass                                                                                                                                                                                                                                     |
| Storybook, 21 stories (static build)                     | all render. 3 log errors that are noise: `StoryContent` (2×) fails to load an external image (`ERR_NAME_NOT_RESOLVED`, sandbox has no DNS for it), `controls-input--input` throws Storybook's "implicit action arg" deprecation          |
| `npm run dev` cold start                                 | `(!) Failed to run dependency scan … "./elements" is not exported … from package svelte`. This error already exists on Kit 2 and comes from `import { type SvelteHTMLElements } from 'svelte/elements'` in `AccessibleTransition.svelte` |
| PWA on `vite preview`                                    | 1 SW registration, Workbox precache 48 entries, `/` and `/settings` return 200 offline                                                                                                                                                   |

The "noise" errors and the dep-scan error show up identically in every later run and aren't repeated below.

### 1. Codemod

`npx sv migrate sveltekit-3 --tasks all --confirm --install npm` (sv 1.1.1). Its tasks are `package-json`, `tsconfig`, `svelte-config`, `environment`, `paths`, `external-redirects`, `shallow-routing`, `params`, `imports`, `lib-alias`, `app-state` and `collect-migration-instructions`. It runs `npm run format` and then the install. It changed 132 files.

- **package.json: yes, it bumps.** `@sveltejs/kit ^3.0.0`, `adapter-node ^6.0.0`, `adapter-vercel ^7.0.0`. These are caret ranges, so story 03 must re-pin them exactly (`3.1.0`, `6.0.0`, `7.0.1`). It also adds `"imports": { "#lib": "./src/lib/index.js", "#lib/*": "./src/lib/*" }`. The bare `#lib` entry points at a file that doesn't exist and must be dropped.
- **Its install doesn't hold up.** The codemod's own `npm install` went through, but a clean `npm ci` then fails with `ERESOLVE … While resolving: @vite-pwa/sveltekit@1.1.0 Found: @sveltejs/kit@3.1.0`. `npm ls` also flags **`@vercel/analytics@2.0.1` and `@vercel/speed-insights@2.0.0`** (peer `@sveltejs/kit ^1 || ^2`, no newer versions). The epic didn't anticipate these two. `npm ci` passes once all three get an override:
  ```json
  "@vercel/analytics": { "@sveltejs/kit": "$@sveltejs/kit" },
  "@vercel/speed-insights": { "@sveltejs/kit": "$@sveltejs/kit" },
  "@vite-pwa/sveltekit": { "@sveltejs/kit": "$@sveltejs/kit" }
  ```
- **tsconfig:** `extends: "$app/tsconfig"`, adds `include: ["src", "vite.config.ts", "playwright.config.ts", "tests"]` and `types: ["$app/types", …]`, and drops the options `$app/tsconfig` now provides (`allowJs`, `esModuleInterop`, `allowImportingTsExtensions`, `resolveJsonModule`, `skipLibCheck`, …). The build then warns `tsconfig_invalid: "src/service-worker" should be added to the "exclude" array`.
- **`$lib`:** rewrites all `$lib/…` to `#lib/…` with **`.js`** extensions (324 × `.js`, 123 × `.svelte`, `.svelte.ts` becomes `.svelte.js`), including `tests/specs/news.spec.ts`. **`$common` isn't touched** (11 imports). Neither are `vite.config.ts` and `vite.storybook.config.ts` (the `alias` blocks stay) or `.storybook/`.
- **Other rewrites:** `resolve('/settings')` → `resolve('settings')` (5 calls, Kit 3 pathname form: without a leading `/`, a route ID has one; e2e passes), and the shallow-routing check in `AppLayout.svelte`.
- **`MIGRATION_TASKS.md` (TODO list):** SW tsconfig project (`src/service-worker.ts`), `page.url` readonly (`Header.svelte`, read-only use, so nothing to do), `goto` destinations and `invalidateAll` (`StoryAiSummary.svelte`, internal route and no `invalidateAll` there, so nothing to do), `preloadData` errors (`ButtonLink.svelte`), dev CORS for static assets (not used), `json`/`text` deprecated (`src/service-worker.ts`), adapter-node `ORIGIN` → `paths.origin` (`ORIGIN` isn't set anywhere in `ui`, so nothing to do). There are no `@migration-task` comments.
- After the codemod plus the overrides: `lint` ✅, `test:unit` ✅, `build` ✅, `storybook:build` ✅, `check` ❌ with 2 errors, both in `vite.config.ts` (`'KitConfig'` isn't exported, `'explicitEnvironmentVariables' does not exist in type ExperimentalOptions`).

### 2. `#lib` with `.ts` extensions

**On Kit 2.70.3: works.** A filesystem-resolving script rewrote 456 specifiers in 130 files (`$lib` → `#lib/…ts|.svelte|.svelte.ts`, `$common` → `#common/….ts`, covering `vi.mock`/`import()` strings and `tests/`). Two existing imports already used `.js` for `.ts` files (`StoryHeader.svelte` → `utils/datetime.js`, `Sources.svelte` → `models/settings.js`) and were fixed by hand. No directory/index imports exist. With `"imports": { "#lib/*": "./src/lib/*", "#common/*": "./src/lib/shared/common/src/*" }` and the `alias` blocks removed from both Vite configs:
`check` ✅ (0 errors), `build` ✅, `test:unit` ✅, `storybook:build` ✅ and all stories render (same as baseline), `dev` ✅, `test:e2e` ✅ 77/77 on a warm dev server. The cold first run has 6 `news.spec.ts` "Search" timeouts, the same on unmodified Kit 2 (dep-scan error above). `lint` needs `prettier --write` on 1 file (`backend/search/keyword.ts`, line length) and flags the now-unused `resolve` import from `node:path` in both Vite configs.

**On Kit 3.1.0: works too.** Same mapping, codemod `.js` specifiers converted to `.ts` and `$common` → `#common/*.ts`, `alias` removed: `lint` ✅, `check` ✅ (0 errors, 1384 files), `test:unit` ✅, `build` ✅, `storybook:build` ✅, `test:e2e` ✅ 77/77 (warm). This holds even though the codemod removed `allowImportingTsExtensions` from `ui/tsconfig.json` (`$app/tsconfig` covers it).

**Convention for story 02:** `.ts` extensions (`#lib/models/story.ts`, `#lib/stores/runes/audio.svelte.ts`, `#common/targets/targets.ts`), `.svelte` for components, no bare `#lib` entry and no index imports (none exist). Story 02 should use a script rather than `sv migrate` (which emits `.js`, skips `$common` and expects Kit 3). Rewrite script used in the spike (run from `ui/`, arg `.`):

```js
// rewrite-imports.mjs: $lib/$common → #lib/#common with explicit extensions
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
const root = process.argv[2];
const bases = { $lib: "src/lib", $common: "src/lib/shared/common/src" };
const target = { $lib: "#lib", $common: "#common" };
const files = execSync(`git ls-files 'src/**' 'tests/**' '.storybook/**'`, {
  cwd: root,
})
  .toString()
  .trim()
  .split("\n")
  .filter(
    (f) =>
      /\.(ts|js|svelte|mdx)$/.test(f) && !f.startsWith("src/lib/shared/common"),
  );
const resolveSpec = (alias, rest) => {
  const base = join(root, bases[alias], rest);
  if (existsSync(base) && statSync(base).isFile()) return rest;
  for (const e of [".ts", ".js", ".svelte.ts", ".svelte.js"])
    if (existsSync(base + e)) return rest + e;
  for (const e of ["index.ts", "index.js"])
    if (existsSync(join(base, e))) return `${rest}/${e}`;
  return null;
};
for (const f of files) {
  const p = join(root, f);
  const src = readFileSync(p, "utf8");
  const out = src.replace(
    /(['"])(\$lib|\$common)\/([^'"]+)\1/g,
    (m, q, alias, rest) => {
      const r = resolveSpec(alias, rest);
      if (r === null) {
        console.warn(`unresolved ${f}: ${m}`);
        return m;
      }
      return `${q}${target[alias]}/${r}${q}`;
    },
  );
  if (out !== src) writeFileSync(p, out);
}
```

### 3. Config options and `svelte-kit sync`

- **`alias`** still exists but is `@deprecated`. The build warns `config_option_deprecated_alias … Use subpath imports instead` and keeps working (that's why `$common` still resolved after the codemod).
- **`experimental.explicitEnvironmentVariables`** has been removed. Kit 3's `experimental` only knows `remoteFunctions` and `forkPreloads` (`tracing`, `instrumentation` and `handleRenderingErrors` are explicitly "removed"). Unknown keys are tolerated at runtime, but the type rejects it, so `check` fails. Explicit env via `$app/env` is now the only mode, so delete the option.
- **`csp`** still exists, unchanged. The type is now `Config['csp']` from **`@sveltejs/kit/vite`**. `KitConfig` from `@sveltejs/kit` is gone (`vite.config.ts` line 3/19).
- **`svelte-kit sync`** still exists (`svelte-kit sync [--config] [--mode]`), so the `check`/`prepare` scripts, the Dockerfile and CI need no change for it.
- **New:** `serviceWorker: { register: false }` exists, so Kit's auto-registration can be turned off (relevant for PWA option C).

### 4. PWA

- **`@vite-pwa/sveltekit`:** `latest` is still 1.1.0 (peer `^1.3.1 || ^2.0.1`). Installing it needs the override above. Kit 3 support PR [vite-pwa/sveltekit#111](https://github.com/vite-pwa/sveltekit/pull/111) was **closed unmerged on 2026-10-09**. The maintainer says Kit 3 needs "a lot of work at vite-plugin-pwa", and support will come with a v2 built on `unplugin-pwa`, with no date. The PR author published the PR as **`@katama-labs/vite-pwa-sveltekit@2.0.0`** (one version, 2026-10-06, peer `@sveltejs/kit ^3.0.0`, depends on `vite-plugin-pwa ^2.0.0`, which is now `latest`).
- **1.1.0 with the override (option A as written): not viable.** Build and dev succeed, but the plugin never runs its injectManifest step. Kit 3 builds `src/service-worker.ts` itself in a new `serviceWorker` Vite environment (`Building service worker`). The output still contains the literal `self.__WB_MANIFEST` (undefined at runtime), and the plugin's `PWA v1.1.0 / precache N entries` log line is missing. In the browser: 1 registration (Kit's own and the plugin's `registerSW.js` register the same URL), **no precache cache**, `/` and `/settings` **fail offline**. `virtual:pwa-info` still resolves and `manifest.webmanifest` is still emitted. The build also warns `transform_index_html_unsupported: vite-plugin-pwa:pwa-assets`.
- **Fork `@katama-labs/vite-pwa-sveltekit@2.0.0` + `vite-plugin-pwa@2.0.0` (drop-in, only the import changes, no override needed): works.** Build logs `SvelteKit VitePWA v2.0.0, mode injectManifest, precache 49 entries`. Browser: 1 registration, precache 49 entries (same files as Kit 2, chunks split differently, plus `entry/payload`), offline 200 for `/` and `/settings`, no errors. Its risk: a third-party fork with one publisher and one release, which we'd swap back to `@vite-pwa/sveltekit` v2 when that ships.
- **What Kit 3 exposes (option B):** `$app/service-worker` now exports only `self` (typed `ServiceWorkerGlobalScope`). `build`, `files`, `prerendered` and `version` moved: `$app/manifest` exports `immutable`, `assets`, `prerendered` (each `Array<{ path }>`, paths **relative**, root is `''`) and `routes`, and `version` comes from `$app/env`. There are no content hashes, so the precache revision is `null` for `immutable` (hashed filenames) and `version` for assets/prerendered pages.
- **Option B prototype (plugin removed): works.** Changes:
  - `src/service-worker.ts`: `import { assets, immutable, prerendered } from '$app/manifest'`, `import { version } from '$app/env'`, `wbManifest = [...immutable.map(({ path }) => ({ url: `/${path}`, revision: null })), ...[...assets, ...prerendered].map(({ path }) => ({ url: `/${path}`, revision: version }))]`. Without the leading `/`, Workbox throws `add-to-cache-list-unexpected-type` on the root entry `''` and the SW fails to evaluate.
  - New `src/routes/manifest.webmanifest/+server.ts` (`prerender = true`, returns `src/assets/manifest.ts` as `application/manifest+json`).
  - `AppLayout.svelte`: the `virtual:pwa-info` link becomes a static `<link rel="manifest" href="/manifest.webmanifest">`.
  - `SvelteKitPWA` is removed from both Vite configs.
    Result: 1 registration (Kit's), precache 51 entries (Kit 2's 48 minus `registerSW.js`, plus `robots.txt`, `sitemap.xml`, `sitemap_index.xml`), offline 200, no errors. Trade-offs: every deploy changes `version`, so all static assets including ~2.7 MB of screenshots are re-downloaded on each update (filtering `assets` or a build-time hash would fix that). `devOptions` (SW in dev with `navigateFallback`) has no direct equivalent (Kit registers its SW in dev as a module), and that wasn't tested.
- **Option B in dev (`vite dev`), compared with Kit 2 + plugin `devOptions` today.** Same headless check: load, reload, then go offline and request `/api/trpc/news.checkUpdates`, `/`, `/settings` and `/bookmarks`.

  |                                                   | Kit 2 + `@vite-pwa/sveltekit` (today)                                | Kit 3, option B                                                                                      |
  | ------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
  | SW registered and controlling the page            | yes, `/service-worker.js`                                            | yes, `/service-worker.js`                                                                            |
  | Precache                                          | none                                                                 | 18 entries (static assets, `?__WB_REVISION__=<version>`). `immutable`/`prerendered` are empty in dev |
  | API runtime cache (`api-news-search-v4`)          | 2 entries                                                            | 2 entries                                                                                            |
  | Offline API fallback (`news.checkUpdates`)        | 200 `{"result":{"data":{"updateAvailable":false}}}`                  | same                                                                                                 |
  | Offline navigation `/`, `/settings`, `/bookmarks` | `ERR_INTERNET_DISCONNECTED`                                          | `ERR_INTERNET_DISCONNECTED` (same)                                                                   |
  | Errors                                            | cold-start `504 (Outdated Optimize Dep)` and a failed dynamic import | none                                                                                                 |

  The fork (option A) in dev behaves exactly like Kit 2 today: SW controls the page, no precache, API cache and offline API fallback work, offline navigation fails, no errors. The fork keeps per-file MD5 revisions (`workbox-build` 7.4.1 via `vite-plugin-pwa` 2.0.0). For example `screenshots/desktop_news_list.png` → `250a0070…` and `settings` → `3c74521a…`, while `_app/immutable/**` gets `null`. So returning clients only re-download changed files. The fork is small: `dist/index.mjs` is 283 lines, 23.5 kB unpacked, with no install scripts.

  Dropping the plugin's `devOptions` loses nothing. Dev has never served the app offline, and checking offline navigation needs `npm run preview` on both.

- **Option C (`vite-plugin-pwa` directly, `serviceWorker.register: false`):** not prototyped. The register option exists, but Kit 3 always builds `src/service-worker.*` itself, so C would mean moving the SW outside Kit's path and re-solving the build-hook ordering that PR #111 had to fix. The fork already is that fix, so C is more work than A-fork or B for the same result.

### 5. Storybook

- `@storybook/sveltekit@10.6.2` is the newest version that passes safe-chain's 48 h minimum age. Its peers don't mention Kit. `npm run storybook:build` ✅ and `npm run storybook` ✅ on Kit 3. `#lib/*` resolves in `vite.storybook.config.ts` (builder-vite reads `package.json` `imports`).
- **Dev (`npm run storybook`): all 21 stories render** (same as baseline). `$app/env`, `$app/env/public`, `$app/state` and `$app/paths` resolve.
- **Static build (deployed to GitHub Pages): broken. All 21 stories fail** with `pageerror: __SVELTEKIT_PAYLOAD__ is not defined`. Cause: Kit 3's `$app/env` (`version`) and `$app/paths` read `__SVELTEKIT_PAYLOAD__`. In dev the plugin defines it as `globalThis.__sveltekit_<hash>` (undefined, falls back to `{}`). In build it's only defined inside Kit's own client build, which Storybook's build isn't.
- **Prototyped fix (works):** in `vite.storybook.config.ts`
  ```ts
  export default defineConfig({
    define: {
      __SVELTEKIT_PAYLOAD__: 'undefined',
    },
    …
  ```
  After this, the static build renders all 21 stories, identical to baseline. No package changes needed. Story 03 applies it.

### 6. Sonda

`sonda/sveltekit@0.14.0` works on Kit 3 and writes reports to `.sonda/`. It now writes 3 reports per build, all named `sonda_client_N.html` (one per Vite environment: client, SSR, service worker). Kit 2 wrote `sonda_client_0` + `sonda_server_0`. This is cosmetic only, no change needed.

### 7. Adapters

- **Vercel (`npm run build`, adapter-vercel 7.0.1):** ✅. Output in `.vercel/output`, with `static/service-worker.js`.
- **Node (`USE_ADAPTER_NODE=true npm run build`, adapter-node 6.0.0):** ❌ as is: `ReferenceError: __dirname is not defined in ES module scope` in `.svelte-kit/output/server/…/api/trpc/_...procedure_/_server.ts.js` (bundled `jsdom/lib/jsdom/living/css/helpers/computed-style.js`). adapter-node 6 bundles **everything except `package.json` `dependencies`** (`ssr.noExternal: true`, `external: Object.keys(pkg.dependencies)`). `ui` has no `dependencies`, so 1394 modules including `jsdom` are inlined. On Kit 2 + adapter-node 5 the same build passes. **Fix:** move `jsdom` to `dependencies`. The build then succeeds (`build/` = `client/`, `prerendered/`, `server/`, `index.js`, `handler.js`, `adapter-node.js`, 27 MB).
- **Runtime:** with `jsdom` external, `node build` alone serves `/` (prerendered) but `/api/trpc/info` returns 500 `ERR_MODULE_NOT_FOUND: Cannot find package 'jsdom'`. With `npm ci --omit=dev` next to it (26 MB, `jsdom`'s tree only), `/` → 200 and `/api/trpc/info` → 200 `{"result":{"data":{"apiVersion":4,…}}}`. So `node_modules` is still needed at runtime, but only for production `dependencies`. Story 05 should move only packages that can't be bundled (at least `jsdom`; anything bundled works without being installed), and the image should run `npm ci --omit=dev`.
- The Dockerfile still `COPY`s `postcss.config.cjs`, `svelte.config.js` and `tailwind.config.ts`, which don't exist (story 05). `ORIGIN` isn't used anywhere.

### Impact on later stories

- **02:** use the rewrite script above, with `.ts` extensions. Also remove the now-unused `resolve` import from both Vite configs, fix the two existing `.js` imports of `.ts` files, and run `prettier --write`. Size M is unchanged.
- **03:** re-pin the codemod's caret ranges. Add peer overrides for `@vercel/analytics` and `@vercel/speed-insights` (new, permanent until they declare Kit 3) and for `@vite-pwa/sveltekit` (temporary, story 04 removes it). Drop the bare `"#lib"` entry, `explicitEnvironmentVariables` and `KitConfig` (→ `Config` from `@sveltejs/kit/vite`). Apply the Storybook `define` fix. Add `src/service-worker` to the tsconfig `exclude`. Delete `MIGRATION_TASKS.md`. `svelte-kit sync` and Sonda need no change. Between 03 and 04 the service worker builds but its precache is empty. That's acceptable on the epic branch. Size stays L.
- **04:** switch to the fork (one import line in both Vite configs, `vite-plugin-pwa` 1.3.0 → 2.0.0), remove the `@vite-pwa/sveltekit` override, and verify. Size L → S.
- **05:** moving `jsdom` to `dependencies` is required for the build, not just tidiness. The Dockerfile's `COPY` list must also drop `tailwind.config.ts`, which doesn't exist either. Use `npm ci --omit=dev` in the runtime image. Size M is unchanged.

## Decision

**PWA option A, using the fork `@katama-labs/vite-pwa-sveltekit@2.0.0` with `vite-plugin-pwa@2.0.0`.** Decided by the user on 2026-10-20.

Why:
- It's the only option that keeps today's behaviour exactly: per-file MD5 revisions (returning clients only re-download changed files), the plugin's precache filtering, the generated web manifest and `virtual:pwa-info` link, and `devOptions`. That matches the epic's "PWA stays as it is" goal.
- It has the smallest diff: one import line in `vite.config.ts` and `vite.storybook.config.ts`, plus the `vite-plugin-pwa` bump. No peer override is needed. Story 04 shrinks from L to S.
- It's verified in this spike: 1 SW registration, 49 precache entries (the same files as Kit 2), offline `/` and `/settings` return 200, and dev behaves the same as on Kit 2.
- The fork is small enough to review in full (283 lines, no install scripts). It's pinned to an exact version.

Accepted risks:
- It's an unofficial fork with one publisher and one release. If a later Kit 3.x changes its build order and the fork isn't fixed, we fall back to option B. The B prototype from the findings above is the starting point for that.
- Move back to the official `@vite-pwa/sveltekit` once its v2 declares Kit 3 support (tracked in the epic's risks).

Rejected: **B** (native Kit SW) works but needs our own revision hashing and precache filtering to avoid re-downloading ~2.7 MB of static assets on every deploy. **C** wasn't prototyped: it means rebuilding the fork's build-order fix ourselves. The official **1.1.0 with an override** builds, but leaves the precache empty.
