# 07: Release to develop

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** 06
**Size:** S — one merge and a prerelease through the existing pipeline, plus a smoke test

## User story

As the maintainer, I want the SvelteKit 3 migration merged into `develop` and published as a prerelease, so that it ships with the next release to `main`.

## Description

Merging is the user's decision, and it triggers semantic-release. This story ends with the migration on `develop` as a `5.0.0-next.N` prerelease. Releasing to `main`/production is out of scope and happens later as part of a regular release.

### Runbook

#### Prerequisites

- [ ] Story 06 is Done with no open QA failures.
- [ ] Merge rights on `Robin-w151/orfarchiv-ui`. GitHub changes in this runbook are done in the web UI.
- [ ] Before merging, open <https://develop.orfarchiv.news> on desktop Chromium and in the installed app on the phone, so the Kit 2 service worker is active there. Leave the desktop tab open.
- [ ] The PR `feat/sveltekit-3` → `develop` exists and CI is green on it, including the `CI / storybook` job from story 08. Open that job → _Smoke test Storybook_ step. **Expected:** one `✓` line per story and `21/21 stories passed` (or the current story count). If the PR doesn't exist yet, create it on GitHub: `Robin-w151/orfarchiv-ui` → _Pull requests_ → _New pull request_ → base `develop`, compare `feat/sveltekit-3` → _Create pull request_, title `feat: migrate to sveltekit 3`.

#### Steps

1. **Merge the feature PR into `develop`.**
   GitHub → `Robin-w151/orfarchiv-ui` → _Pull requests_ → the `feat/sveltekit-3` → `develop` PR → merge button dropdown → _Squash and merge_. Before confirming:
   - Commit message: `feat: migrate to sveltekit 3 (#<PR_NUMBER>)`. `feat` triggers the `5.0.0-next.N` prerelease.
   - Extended description: clear it. The default lists every branch commit, and a `BREAKING CHANGE` line in there would change what semantic-release releases.
   - `<PR_NUMBER>`: the number of this PR.

   Then _Confirm squash and merge_.
   **Expected:** the PR shows _Merged_, and a _CI_ workflow run starts on `develop` (Actions tab).

2. **Wait for CI and the prerelease.**
   GitHub → `Robin-w151/orfarchiv-ui` → _Actions_ → the _CI_ run for the merge commit.
   **Expected:** the run is green, and semantic-release creates a `chore(release): 5.0.0-next.N [skip ci]` commit on `develop` plus a `v5.0.0-next.N` release under _Releases_.
3. **Smoke-test the `develop` deployment.** Once the deployment for the merge commit is live, open https://develop.orfarchiv.news. Repeat story 06 steps 3–5 quickly (search, semantic search, story content, bookmarks, settings, console/CSP, one service worker).
   **Expected:** same results as in story 06, and Settings → Info shows `5.0.0-next.N`.
4. **Existing installs update.** After the `develop` deployment is live, focus the desktop tab left open from the prerequisites and reopen the app on the phone.
   **Expected:** the update prompt appears. After accepting it, the app reloads and the prompt appears **once more**. That's expected for installs coming from Kit 2 (story 04 `## Verification`), so accept it again. After that, Settings → Info shows `5.0.0-next.N`, DevTools → Application → Service workers lists exactly one SW (desktop), and the app works offline as before (DevTools → Network → Offline, reload `/`).
5. **Check the Storybook deployment.** GitHub → `Robin-w151/orfarchiv-ui` → Actions → _Storybook_ workflow run for the merge commit, then open the GitHub Pages URL from the run's _Deploy Storybook to GitHub Pages_ step. Click through a few stories (e.g. Controls → Button, Content → Story content, Loading → Story skeleton).
   **Expected:** the workflow is green, its _Smoke test Storybook_ step ran before _Upload Storybook artifacts_ and ends with `N/N stories passed`, and the stories render without errors.
6. **Delete the feature branch.**
   On the merged PR page → _Delete branch_ (the repo doesn't delete merged branches automatically).
   **Expected:** the PR shows that `feat/sveltekit-3` was deleted, and it no longer appears under _Branches_.
7. **Bump the submodule in the root repo.**
   First, in `.tasks/0003-sveltekit-3-migration/08-storybook-smoke-test.md`, tick the two CI acceptance criteria, confirmed by the prerequisite and step 5, and set its header to _Done_. Then set the statuses of story 08, this story and the epic in `.tasks/0003-sveltekit-3-migration/README.md` (and this story's header) to _Done_, then:

   ```sh
   cd /workspaces/orfarchiv
   git -C ui checkout develop && git -C ui pull
   git add ui .tasks/0003-sveltekit-3-migration && git commit -m "chore: bump submodules"
   ```

   **Expected:** one root commit with the `ui` pointer at the prerelease commit, and stories 07 and 08 and the epic marked _Done_.

#### Verify

```sh
cd ui && git log origin/develop --oneline -3
git show origin/develop:package.json | grep '"@sveltejs/kit"'
```

**Expected:** `develop` contains the merge and the `5.0.0-next.N` release commit, and `package.json` pins `@sveltejs/kit` 3.1.x.

#### Rollback

Production (`main`) isn't touched, so nothing live needs rolling back. If `develop` must be reverted: GitHub → the merged PR → _Revert_ → this opens a revert PR against `develop` → merge it.

#### Hand back to Claude

- The prerelease version (`5.0.0-next.N`) and confirmation that the smoke test passed, so the epic can be closed.

#### Troubleshooting

- **semantic-release fails on `develop`** → check the CI log. The release config is `ui/.releaserc.json`.
- **`CI / storybook` fails on the PR, or _Smoke test Storybook_ fails on `develop`** → the step log names each failing story with its `pageerror` or `empty #storybook-root`. Hand the failing lines to Claude for story 08. The deploy is skipped, so Pages keeps serving the previous Storybook.
- **Storybook workflow fails on `develop`** → run `npm run storybook:build` locally on `develop` and hand the error to Claude. The Pages deployment keeps serving the previous Storybook until it's fixed.
- **Second update prompt right after the first one (step 4)** → expected once for Kit 2 installs. Accept it. Between the two accepts, DevTools shows one registration with an active and a waiting worker; that's not two SWs. Only a third prompt or a lasting waiting worker is a problem.
- **Update prompt never appears, or two SWs are listed (step 4)** → revert (see Rollback). The old SW is served again, and clients go back to it through the normal update flow. Hand the details to Claude for story 04.
- **develop.orfarchiv.news still shows the old version** → the PWA serves the old build until the update prompt is accepted. Accept it or hard-reload, then check Settings → Info again.
- **`develop` deployment fails but the feature preview passed** → compare env vars for the `develop` branch with Preview (Vercel → Settings → Environment Variables), especially `PUBLIC_APP_MODE` and `PUBLIC_ENABLE_ANALYTICS`, which are validated by `src/env.ts`.

## Acceptance criteria

- [ ] Given `develop` in `ui`, then it contains the SvelteKit 3 migration and a `5.0.0-next.N` prerelease.
- [ ] Given https://develop.orfarchiv.news serves the merge commit, then the smoke test passes.
- [ ] Given desktop and phone had the Kit 2 app open on develop.orfarchiv.news before the merge, when the new deployment is live, then both show the update prompt and end up on `5.0.0-next.N` with exactly one service worker.
- [ ] Given the Storybook workflow on `develop`, then it's green and the GitHub Pages Storybook renders its stories.
- [ ] Given the root repo, then the `ui` submodule pointer is bumped and the epic is marked Done.

## Technical notes

- Release config: `ui/.releaserc.json`, `ui/.github/workflows/ci.yaml` (semantic-release job).

## Out of scope

- Releasing to `main` and production on Vercel. That happens later with a regular release.
