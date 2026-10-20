# 06: Preview QA

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** 04, 05
**Size:** M — a long manual checklist across desktop and a real phone, including PWA install/update flows

## User story

As the maintainer, I want to verify the SvelteKit 3 build on a real Vercel preview and real devices, so that I can merge it into `develop` without regressions.

## Description

Vercel serverless functions, the CSP headers in production mode, PWA installation and notifications on a phone can't be checked by Claude from the devcontainer. This is a structured manual pass over the Vercel preview deployment of `feat/sveltekit-3`.

### Runbook

#### Prerequisites

- [ ] Stories 01–05 are done and committed on `feat/sveltekit-3` in `ui`, the branch is pushed, and CI is green on its latest commit.
- [ ] Access to the Vercel project for `orfarchiv-ui` (Dashboard → project → Deployments).
- [ ] Desktop Chromium (Chrome/Edge) and one real phone (Android Chrome preferred for install + notifications; iOS Safari optional).
- [ ] <https://develop.orfarchiv.news> open in a second tab as the Kit 2 baseline for side-by-side comparison. It runs the same code minus the migration, while production (`https://orfarchiv.news`, `main`) may lag behind.

#### Steps

1. **Open the preview deployment.**
   Vercel Dashboard → project → Deployments → the latest deployment for branch `feat/sveltekit-3` → Visit. Note the URL as `<PREVIEW_URL>`.
   **Expected:** the news list loads.
   If no preview exists, push the branch: `git -C ui push -u origin feat/sveltekit-3`.
   Then check GitHub → `Robin-w151/orfarchiv-ui` → Actions → *Test* workflow (`test.yaml`): it runs the Playwright e2e suite against this preview on Vercel's `deployment_status` event.
   **Expected:** the *Test* run for this deployment is green.
2. **Check build logs.**
   Deployment → Build Logs. Search for `deprecat` and `warn`.
   **Expected:** no SvelteKit deprecation warnings, and the build uses `@sveltejs/kit 3.x`.
3. **Core flows (desktop).** On `<PREVIEW_URL>`:
   - Keyword search (e.g. `Wien`) → results appear.
   - Semantic search (same toggle/mode as on develop.orfarchiv.news) → results appear.
   - Filter by source and date.
   - Open a story → content loads (the `news.content` tRPC call), images and charts render.
   - Bookmark a story → it appears under `/bookmarks`. Remove it.
   - `/settings` → change a setting, reload, setting persists.
   - Click the header title while on `/` with a search entered and the list scrolled → search term and scroll position stay as on develop.orfarchiv.news.
   - Open `<PREVIEW_URL>/does-not-exist` → redirected to `/`.
   **Expected:** everything behaves like on develop.orfarchiv.news.
4. **Console and CSP.** DevTools → Console, reload `/`, `/bookmarks`, `/settings`.
   **Expected:** no errors, no `Refused to …` CSP violations.
5. **Service worker (desktop).** DevTools → Application → Service workers.
   **Expected:** exactly one SW for `<PREVIEW_URL>`, status *activated and running*. Application → Cache storage contains a Workbox precache plus `api-news-search-v…` after a search.
6. **Offline.** DevTools → Network → Offline. Reload `/`, `/bookmarks` and `/settings`, then run the same search again and open a previously opened story.
   **Expected:** all three pages render, cached search and content are shown, no browser error page.
7. **Update flow.** Push any no-op commit to the branch (or Redeploy in Vercel). Wait for the new preview, then focus the already open tab.
   **Expected:** the app's update prompt appears, and accepting it reloads into the new version (Settings → Info shows the new commit hash).
8. **Install (phone).** Open `<PREVIEW_URL>` on the phone → browser menu → *Install app* / *Add to Home Screen*.
   **Expected:** installs with the ORF Archiv icon and name, and opens standalone.
9. **Notifications (phone, Android).** On `<PREVIEW_URL>` (installed app): Settings → *Allgemein* → enable the news-updates checkbox and allow notifications when asked. Go back to `/`, then put the app in the background and wait until new stories are scraped (usually a few minutes).
   **Expected:** a system notification "Neue Nachrichten verfügbar" appears; tapping it brings the app to the foreground on `/` and loads the new stories.
10. **Vercel functions.** Vercel → Deployment → Functions.
    **Expected:** the tRPC function runs on the Node runtime in the same region as production (`fra1`).
11. **Docker image** (Docker isn't available in the devcontainer, so this runs on a machine with Docker, on the `feat/sveltekit-3` checkout):

    Run all commands in **one terminal**. The DB URL is read interactively so it doesn't end up in the shell history, and the variable isn't exported, so it has to be read again in a new terminal. `read -rs "VAR?prompt"` is zsh syntax.

    ```sh
    cd <UI_DIR> && ./build-docker.sh
    docker image ls orfarchiv
    read -rs "ORFARCHIV_DB_URL?DB URL: " && echo
    docker run --rm -p 8080:8080 -e ORFARCHIV_DB_URL="$ORFARCHIV_DB_URL" orfarchiv
    ```

    - `<UI_DIR>`: the `ui` submodule folder on that machine.
    - At the `DB URL:` prompt, paste a reachable MongoDB URL (the dev or VPS URL from `ui/.env`).

    **Expected:** the build succeeds, and `http://localhost:8080` loads news. Note the image size from `docker image ls` under `## QA results`.
    Then stop the container (Ctrl+C) and check secret mounting:

    ```sh
    printf '%s' "$ORFARCHIV_DB_URL" > /tmp/db_url
    docker run --rm -p 8080:8080 -v /tmp/db_url:/run/secrets/db_url -e ORFARCHIV_DB_URL_FILE=/run/secrets/db_url orfarchiv
    rm /tmp/db_url
    ```

    **Expected:** `http://localhost:8080` loads news as well.
    Then stop the container and check multi-target URLs from a secret file, the same way the `scraper` and `db` containers receive them:

    ```sh
    read -rs "ORFARCHIV_DB_URL_2?Second DB URL: " && echo
    printf '%s\n%s' "$ORFARCHIV_DB_URL" "$ORFARCHIV_DB_URL_2" > /tmp/db_urls
    docker run --rm -p 8080:8080 -v /tmp/db_urls:/run/secrets/db_urls -e ORFARCHIV_DB_URLS_FILE=/run/secrets/db_urls orfarchiv
    rm /tmp/db_urls
    ```

    - At the `Second DB URL:` prompt, paste the URL of the other target (e.g. M0 if the first one was the VPS).

    **Expected:** `http://localhost:8080` loads news, and the container log shows `Using database targets: <label 1>, <label 2>` (labels only, no credentials) without a `DatabaseConfigError`.
    Then stop the container and check the embedding token from a secret file:

    ```sh
    read -rs "ORFARCHIV_EMBEDDING_TOKEN?Embedding token: " && echo
    printf '%s' "$ORFARCHIV_EMBEDDING_TOKEN" > /tmp/embedding_token
    docker run --rm -p 8080:8080 -e ORFARCHIV_DB_URL="$ORFARCHIV_DB_URL" -e ORFARCHIV_EMBEDDING_URL=<EMBEDDING_URL> -v /tmp/embedding_token:/run/secrets/embedding_token -e ORFARCHIV_EMBEDDING_TOKEN_FILE=/run/secrets/embedding_token orfarchiv
    rm /tmp/embedding_token
    ```

    - At the `Embedding token:` prompt, paste the bearer token of the embedding server.
    - `<EMBEDDING_URL>`: the embedding server's base URL, as set for `ORFARCHIV_EMBEDDING_URL` on Vercel (`/embeddings` is appended by the app).

    **Expected:** a semantic search on `http://localhost:8080` returns results, and the container log shows no 401/403 from the embedding server and never the token itself.

#### Verify

Every step 1–11 is ticked. Write the failures as a list into this file under `## QA results` (step number, what happened, screenshot path if any).

#### Rollback

Nothing live changes in this story. Preview deployments don't affect production.

#### Hand back to Claude

- The `## QA results` list. Each failure becomes a fix on `feat/sveltekit-3` before story 07.
- Confirmation that the preview passed (set this story to Done).

#### Troubleshooting

- **Two service workers listed** → Kit and the PWA plugin both register one. Back to story 04.
- **Old SW keeps serving the old app** → DevTools → Application → Service workers → *Unregister*, then hard-reload. If real users would be stuck, that's a blocker for story 07.
- **CSP violation for an inline script** → `csp-script-hashes.js` is stale. Run `npm run generate:csp-script-hashes` in `ui`.
- **tRPC 403 on POST** → Kit 3's always-on CSRF check rejected the request. Check the request has `content-type` and is same-origin.

## Acceptance criteria

- [ ] Given the Vercel preview of `feat/sveltekit-3`, when running steps 1–10, then all pass or every failure is fixed and re-checked.
- [ ] Given the phone, then the app installs, the offline search fallback works, and `/`, `/bookmarks` and `/settings` load offline.
- [ ] Given a machine with Docker, when running step 11, then the `orfarchiv` image builds, serves news on port 8080 with `ORFARCHIV_DB_URL`, `ORFARCHIV_DB_URL_FILE` and `ORFARCHIV_DB_URLS_FILE` (two targets), semantic search works with `ORFARCHIV_EMBEDDING_TOKEN_FILE`, and its size is recorded.

## Technical notes

- Vercel project config: `ui/vercel.json` (headers and rewrites), `ui/.vercel/`.
- CSP: `ui/csp-config.js`, `ui/csp-script-hashes.js` (`DISABLE_CSP` must not be set on Vercel).
- Update flow code: `ui/src/lib/utils/updateListener.ts`. Notifications: `ui/src/lib/utils/notifications.ts`, permission requested from `ui/src/lib/components/settings/general/General.svelte`, triggered by `news.checkUpdates` in `ui/src/lib/components/news/News.svelte`.

## Out of scope

- Merging into `develop` (story 07).
