# 08: Storybook smoke test in CI

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** 03
**Size:** S — one Node script and two workflow steps, plus one story fix so the check starts green

## User story

As the maintainer, I want CI to fail when a Storybook story throws at runtime, so that a broken Storybook never reaches GitHub Pages unnoticed.

## Description

On Kit 3, `npm run storybook:build` passed while every story in the static build threw `__SVELTEKIT_PAYLOAD__ is not defined` (story 01). Story 03 fixed that with `define: { __SVELTEKIT_PAYLOAD__: 'undefined' }` in `ui/vite.storybook.config.ts`. But nothing in CI renders the stories, so losing that line or a future Kit change would ship a broken Storybook from `develop` without any failing check. This story adds a headless smoke test of the built `storybook-static`.

Steps:

1. **Script `ui/scripts/storybook-smoke.js`** (plain ESM, like `scripts/generate-csp-script-hashes.js`). It takes the base URL as an argument, reads `${base}/index.json`, and opens each entry of `type: 'story'` at `${base}/iframe.html?id=<id>&viewMode=story` in Playwright Chromium (`@playwright/test` is already a devDependency). It waits for `load` and then up to 10 s for either content in `#storybook-root` or Storybook's error overlay (`body.sb-show-errordisplay`), so a stalled external request can't time a story out. It collects `pageerror` events. It prints one line per story and exits `1` if any story has a `pageerror`, shows the error overlay (render errors Storybook catches itself) or renders nothing. Console `error` messages are only printed, not failed on (e.g. external image loads).
2. **Fix the known `pageerror` first.** `controls-input--input` throws Storybook's implicit-action deprecation (`onValueChange`). Give `ui/src/stories/controls/Input.stories.js` an explicit spy (`import { fn } from 'storybook/test'`, `args: { …, onValueChange: fn() }`) so the smoke test starts green. Don't build an allowlist into the script.
3. **npm script:** `"storybook:smoke": "node scripts/storybook-smoke.js"`.
4. **`ui/.github/workflows/storybook.yaml`:** between *Build Storybook* and *Upload Storybook artifacts*, add: `npx playwright install --with-deps chromium`, serve `storybook-static` in the background (`python3 -m http.server -d storybook-static 6006 &`, no new npm dependency), wait until it responds, then `npm run storybook:smoke -- http://localhost:6006`. A failure blocks the Pages deployment.
5. **`ui/.github/workflows/ci.yaml`:** add a `storybook` job (same checkout, Node, safe-chain and `aikido-npm ci --ignore-scripts` steps as `check`) that runs `storybook:build` and the same smoke steps, so PRs into `develop`/`main` catch it before the merge. The job runs on `pull_request` only; on a push to `develop`, `storybook.yaml` covers it. Pin any new actions by commit SHA, as the existing ones are.

## Acceptance criteria

- [x] Given `npm run storybook:build` and `storybook-static` served locally, when running `npm run storybook:smoke -- http://localhost:6006`, then it checks all stories (21 at the time of writing), prints one line per story and exits 0.
- [x] Given the `define` block is temporarily removed from `ui/vite.storybook.config.ts` and Storybook is rebuilt, when running the smoke test, then it exits 1 and names the failing stories (`__SVELTEKIT_PAYLOAD__ is not defined`). The `define` is restored afterwards.
- [x] Given `controls-input--input`, then it renders without the implicit-action `pageerror`.
- [x] Given a PR into `develop`, then the `ci.yaml` `storybook` job runs the build and the smoke test, and is green.
- [x] Given a push to `develop`, then `storybook.yaml` runs the smoke test before *Upload Storybook artifacts* and only deploys if it passes.
- [x] `npm run lint` passes (the new script is covered by ESLint/Prettier).

Verified locally: 21/21 pass. Without `define`, 0/21 pass with `pageerror: __SVELTEKIT_PAYLOAD__ is not defined; empty #storybook-root` and exit 1. The two CI criteria can only be checked once `feat/sveltekit-3` is pushed and the PR into `develop` (story 07) runs.

## Technical notes

- Story 03 verified the stories with a throwaway script that did exactly step 1's loop: `chromium.launch()`, one `newPage()` per story, `page.on('pageerror')`, `goto(…, { waitUntil: 'networkidle' })`, a 500 ms settle, then `document.querySelector('#storybook-root')?.innerHTML.length`. That script wasn't committed, so write it fresh from this description.
- `npm ci --ignore-scripts` in CI skips `prepare` (`svelte-kit sync`). On Kit 3, `storybook:build` fails without it (`Failed to load tsconfig '$app/tsconfig'`), because `tsconfig.json` extends `$app/tsconfig` from `node_modules/$app/`, which only sync generates. Locally this stays hidden by existing sync output. Fixed by `"storybook:build": "svelte-kit sync && storybook build"`, like `check`. This also fixes the existing `storybook.yaml` deploy.
- Playwright browser install adds ~1 min to each job. Cache `~/.cache/ms-playwright` keyed on the `@playwright/test` version if it gets slow, but that isn't required.
- The external image in `StoryContent` resolves in CI (it only failed in the offline devcontainer), and it's a console error anyway, so it doesn't fail the check.

## Testing

- Run the script locally against `storybook-static` (pass), then with the `define` removed (fail), as in the acceptance criteria.
- Open the PR's Actions run and confirm the `storybook` job ran and passed.

## Out of scope

- Visual regression testing or interaction tests (`play` functions).
- `@storybook/test-runner` (would add a dependency and needs a Storybook 10 compatibility check).
- Fixing console errors that aren't `pageerror`s.
