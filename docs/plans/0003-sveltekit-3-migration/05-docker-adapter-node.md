# 05: Docker image on adapter-node 6

**Epic:** [0003 SvelteKit 3 migration](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** 03
**Size:** M — Dockerfile and entrypoint, plus moving server runtime packages to `dependencies` and proving the build runs with production dependencies only

## User story

As the maintainer, I want `ui/Dockerfile` to build and run the SvelteKit 3 app with adapter-node 6, so that the Docker image stays usable as a fallback to Vercel. It isn't deployed anywhere today.

## Description

`ui/Dockerfile` builds with `USE_ADAPTER_NODE=true` and runs `node --experimental-specifier-resolution=node .` via `ui/entrypoint.sh`. It currently `COPY`s `svelte.config.js` and `postcss.config.cjs`, which don't exist, so it fails before reaching the Kit 3 changes.

Changes:

1. Fix the build-stage `COPY` list to the files that exist and are needed: `csp-config.js`, `csp-script-hashes.js`, `tailwind.config.ts` (`src/app.css` loads it via `@config`), `tsconfig.json`, `vite.config.ts`, `package.json`, `scripts/`, `src/` (including the `src/lib/shared/common` submodule contents), `static/`, plus the service-worker tsconfig if story 03/04 added one. `.dockerignore` must not exclude any of them.
2. `npx svelte-kit sync` still exists on Kit 3 (story 01), so keep it.
3. **Runtime dependencies.** Today all 78 packages are `devDependencies`. adapter-node 6 bundles everything not in `dependencies` (`ssr.noExternal: true`), including `jsdom` and `mongodb`, which bundle poorly (dynamic `require`s, optional native modules). Story 01 showed this is **required, not optional**: `USE_ADAPTER_NODE=true npm run build` fails with `ReferenceError: __dirname is not defined in ES module scope` from the bundled `jsdom/lib/jsdom/living/css/helpers/computed-style.js`. Moving only `jsdom` makes the build pass. Move the packages that server code needs at runtime to `dependencies`, so adapter-node keeps them external:
   - Derive the list from the bare imports of server-side code (`src/lib/backend/**`, `src/lib/configs/server.ts`, `src/routes/api/**`, `src/env.ts`, `src/lib/shared/common/src/**` and their non-spec imports). Today these are likely `effect`, `mongodb`, `jsdom`, `@trpc/server`, `winston`, `luxon`, `lru-cache`, `dompurify` and `@mozilla/readability`.
   - Keep exact versions, as in the rest of `package.json`.
   - Don't move build tools, test tools or client-only packages.
   - In the deploy stage, replace `COPY --from=build /app/node_modules/` with a production-only install (`npm ci --omit=dev --ignore-scripts`, using `package.json`, `package-lock.json` and `.npmrc`).
   - Vercel still builds: adapter-vercel now traces the external packages and warns about optional modules of `mongodb` (`snappy`, `kerberos`, `@aws-sdk/credential-providers`, …) and `jsdom` (`canvas`). They are loaded in try/catch, and the production-only run below works without them. Check that `npm run build` with the Vercel adapter still passes.
4. Drop `--experimental-specifier-resolution=node` from `entrypoint.sh` (it has had no effect since Node 19; Node 24 accepts it silently). Keep `file_env ORFARCHIV_DB_URL` and add `file_env ORFARCHIV_DB_URLS`, so the image supports multi-target URLs via `ORFARCHIV_DB_URLS` or `ORFARCHIV_DB_URLS_FILE`, the same way the `scraper` and `db` containers do (epic 0001, story 10: one secret file, URLs separated by newline or `;`). The newlines inside the file must survive `file_env` (`$(cat …)` only strips trailing ones). Also add `file_env ORFARCHIV_EMBEDDING_TOKEN`, so the embedding server's bearer token can come from a secret file via `ORFARCHIV_EMBEDDING_TOKEN_FILE`, matching the scraper's `loadEnvVariable` chain (`_FILE` → env, `scraper/src/services/env.ts`).
5. `ORIGIN` is gone from adapter-node 6. Nothing sets it today, and the image isn't deployed anywhere, so no reverse-proxy configuration (`PROTOCOL_HEADER`/`HOST_HEADER`/`paths.origin`) is added.
6. Static assets are now served for GET/HEAD only, with content-hash ETags. No change needed, but verify.

## Acceptance criteria

Docker isn't available in the devcontainer, so these checks run the adapter-node output directly. Building and running the actual image is done by the user in [story 06](06-preview-qa.md), step 11.

- [x] Given `(export USE_ADAPTER_NODE=true && npm run build)`, then `build/` is produced.
- [x] Given `ui/package.json`, then every bare package imported by server-side code is listed under `dependencies`, and no build, test or client-only tool is.
- [x] Given `build/`, `package.json`, `package-lock.json` and `.npmrc` copied to a temp folder and `npm ci --omit=dev --ignore-scripts` run there, when running `PORT=8080 ORFARCHIV_DB_URL=<url> node build` there, then `GET /` returns 200 with HTML, and `GET /api/trpc/news.search?…` returns JSON or a DB error (not a 404, and not a 500 from a missing module).
- [x] Given a static asset URL from the page (e.g. `/_app/immutable/...js`), when requesting it twice with `If-None-Match`, then the second response is 304.
- [x] Given `ORFARCHIV_DB_URL_FILE` pointing at a temp file, when sourcing `entrypoint.sh`'s `file_env`, then `ORFARCHIV_DB_URL` is set from it.
- [x] Given `ORFARCHIV_DB_URLS_FILE` pointing at a temp file with two URLs on separate lines, when sourcing `entrypoint.sh`'s `file_env`, then `ORFARCHIV_DB_URLS` is set from it with the line break between the URLs intact.
- [x] Given `ORFARCHIV_EMBEDDING_TOKEN_FILE` pointing at a temp file, when sourcing `entrypoint.sh`'s `file_env`, then `ORFARCHIV_EMBEDDING_TOKEN` is set from it, and the token value never appears in logs.
- [x] Given the local production-only run with `ORFARCHIV_DB_URLS` set to two URLs (separated by `;`) and no `ORFARCHIV_DB_URL`, when requesting `GET /api/trpc/news.search?…`, then the request is served from the first reachable target (JSON, or a DB error naming the configured targets, not a `DatabaseConfigError`).
- [x] Given every path in the Dockerfile's `COPY` lines, then each exists in `ui/`.

## Technical notes

- Files: `ui/Dockerfile`, `ui/entrypoint.sh`, `ui/.dockerignore`, `ui/package.json`, `ui/package-lock.json`, possibly `ui/README.md` (only if env vars change, ask first per repo rules).
- The temp-folder check runs npm plainly (safe-chain wrapper; no `timeout`/`env`/`xargs`).
- `ui/build-docker.sh` uses `docker build --network=host -t=orfarchiv .`. Docker isn't installed in the devcontainer (checked 2026-10-20), so the image itself is built and run by the user in story 06, step 11.
- `PORT=8080` is set in the image, and adapter-node still reads `PORT`.
- Story 01 ran this check with only `jsdom` in `dependencies`: `build/` is 27 MB, the production-only `node_modules` 26 MB. `/` returned 200 and `/api/trpc/info` 200, but only after `npm ci --omit=dev`. Without it, `/api/trpc/info` returned 500 `ERR_MODULE_NOT_FOUND: Cannot find package 'jsdom'`.
- `npm ci --omit=dev` needs the `overrides` from stories 03/04 in `package.json` to resolve, so copy `package.json` together with the lockfile.

## Testing

- The commands in the acceptance criteria, run in the devcontainer.
- `docker build`/`docker run` and the image-size comparison: story 06, step 11.

## Out of scope

- Deploying the container anywhere. It's kept as a fallback only.

## Outcome

- `dependencies` (from an import-graph walk of the server entry points): `@mozilla/readability`, `@trpc/server`, `dompurify`, `effect`, `jsdom`, `lru-cache`, `luxon`, `mongodb`, `winston`. The lockfile changes only the `dev` flags, no versions.
- adapter-node `build/` is 16 MB. The production-only `node_modules` is 126 MB, mostly `effect` (56 MB) and `typescript` (24 MB, an auto-installed peer of `@trpc/server`).
- Dockerfile deploy stage: `npm ci --omit=dev --ignore-scripts` runs as root before `USER node`, the entrypoint is copied with `--chmod=755` (a local `0700` mode would otherwise stop the `node` user from running it), and `entrypoint.sh` ends with `exec node .` so node gets SIGTERM. The deploy stage sets `NODE_ENV=production`; without it tRPC's `isDev` default is true and every error response carries `data.stack`. The build stage no longer sets `ORFARCHIV_DB_URL` (optional in `src/env.ts`; the build passes without it or a `.env`).
- `entrypoint.sh`'s `file_env` matches the scraper's `loadEnvVariable`: it trims each line of the secret file (leading/trailing whitespace and `\r`, inner line breaks kept), and a `_FILE` path that isn't readable logs a warning on stderr (path only) and leaves the plain variable untouched.
- `.dockerignore` also excludes `.sonda/`, `build/`, `playwright-report/`, `storybook-static/` and `test-results/`, and ignores `node_modules/` at any depth (`**/node_modules/`), so `src/lib/shared/common/node_modules/` stays out of `COPY src/`.
- Local run: `/` 200 HTML, `/api/trpc/info` 200, `news.search` 503 JSON with no DB listening; with `ORFARCHIV_DB_URLS` both targets are tried in order (`Using database targets: localhost:1, localhost:2`); immutable asset with `If-None-Match` returns 304.
