# S1 — `db`: Vite build + unified Effect CLI

**Owner:** Me   **Repo:** `db`   **Size:** L
**Depends on:** nothing   **Blocks:** [S2](02-shared-module.md)
**Status:** ✅ Done (2026-09-14) — one bundled CLI with service layers, see [Result](#result-2026-09-14)

## Goal

Collapse the three standalone `db` entrypoints into **one CLI program with subcommands** built on
`effect/unstable/cli`, bundled by Vite — structurally identical to how `scraper` is already built,
with **no behaviour change**.

## Why

Three things make this worth doing before any multi-target work:

1. **Triplicated boilerplate.** `backup.ts`, `restore.ts` and `setup.ts` each repeat the same
   `pipe(Effect.matchEffect(main()), Effect.provide(loggerLayer), NodeRuntime.runMain)` wrapper, their
   own `meow` block, and their own copy of `withOrfArchivDb`. Adding `sync` and `verify` ([S4](04-db-sync-and-verify.md))
   would make it five copies.
2. **It decides the shared module's import style.** Once `db` bundles, all three consumers bundle, so
   [S2](02-shared-module.md)'s files can use ordinary extensionless imports and **no consumer needs a
   tsconfig change**. Sequenced the other way, `ui` and `scraper` would both need
   `allowImportingTsExtensions`.
3. **The published image is broken for anything but backup.** `db/Dockerfile` copies only
   `backup.ts`, so `restore` and `setup` are not in the image at all. A bundled build ships the whole
   CLI in one artifact.

## Scope

**In scope**

- `setup`, `backup`, `restore` as subcommands of one program. Behaviour identical to today.
- Vite build, tsconfig alignment, multi-stage Dockerfile, `run.sh`, package scripts.
- Dropping the `meow` dependency.

**Out of scope**

- `sync` and `verify` — those are [S4](04-db-sync-and-verify.md).
- Anything multi-target — that is [S3](03-db-multi-target.md). This story keeps the single
  `ORFARCHIV_DB_URL` behaviour exactly as it is.

## Technical notes

### The CLI surface after this story

```
db setup    [--target]
db backup   [--keep-running] [--cron <expr>]
db restore  [file] [--batch-size <n>] [--dry-run]
```

(`--target` is added in S3; listed here only to show where it lands.)

### `effect/unstable/cli`

**Already present in the installed Effect 4 rc — no new dependency.** Same import style `ui` already
uses for `effect/unstable/http` and `effect/unstable/persistence`. Verified exports:

| Export | Use |
| --- | --- |
| `Command.make`, `Command.withHandler` | Define each subcommand |
| `Command.withSubcommands` | Assemble them under a root command |
| `Command.run` / `Command.runWith` | Execute |
| `Command.withSharedFlags` | **Declare `--target` once** across all subcommands (S3) — the concrete win over `meow` |
| `Flag.string` / `.boolean` / `.integer` / `.optional` / `.withDefault` / `.withAlias` | Flags |
| `Flag.redacted` → `Redacted<string>` | **Use for anything holding a connection URL.** Once targets carry credentials this makes "never log secrets" structural rather than a convention |
| `Flag.withFallbackConfig` | Wire a flag to its env var directly, trimming part of the bespoke `loadEnvVariable` chain (the `_FILE` indirection still needs the custom path) |

Provide the logger layer **once** at the root command instead of per entrypoint.

### Vite build

Mirror `scraper/vite.config.ts`:

```ts
export default defineConfig({
  build: {
    outDir: 'dist',
    ssr: true,
    lib: { entry: { db: './src/index.ts' }, formats: ['es'], name: 'db' },
    emptyOutDir: true,
  },
});
```

### tsconfig and imports — the consequential bit

`db` stops running `.ts` directly under `--experimental-strip-types`. Its tsconfig currently carries
`allowImportingTsExtensions`, `erasableSyntaxOnly` and `module: nodenext` purely because of that;
these are replaced by scraper's `moduleResolution: bundler`.

Relative imports lose their extensions — `./shared/env.ts` becomes `./shared/env` — a mechanical
rewrite across ~5 files.

**Consequence:** local dev needs `bun` (or `vite-node`) rather than bare `node`, exactly as `scraper`
already works. `node --experimental-strip-types` cannot resolve extensionless relative imports.

### Dockerfile

Multi-stage, mirroring `scraper/Dockerfile`:

```dockerfile
# builder: npm ci, COPY ., npm run build  ->  dist/db.js
# runner:  npm ci --omit=dev --ignore-scripts, COPY --from=builder dist/db.js
ENTRYPOINT ["node", "db.js"]
CMD ["backup", "--keep-running"]
```

Add the non-root `USER` (currently runs as root) and document the backup volume while here.

### Other files

- `run.sh`: `npm run backup -- "$@"` becomes `npm start -- "$@"`.
- `package.json`: add `start` (`bun run src/index.ts`) and `build`; the `backup`/`restore`/`setup`
  scripts collapse into subcommands.

## Acceptance criteria

- [x] `npm run build` produces `dist/db.js`.
- [x] `db --help` lists `setup`, `backup`, `restore`; each subcommand's `--help` documents its flags.
- [x] `db backup` against the devcontainer Mongo produces a file identical in shape to the
      pre-refactor output, and `db restore` reads that file back.
- [x] `db backup --keep-running --cron "..."` still schedules, and still swallows a timeout with a
      warning rather than exiting.
- [x] The rebuilt image runs `backup --keep-running` by default **and** can be invoked as
      `docker run … setup` — which the current image cannot do at all.
- [x] `meow` is gone from `package.json`.
- [x] `npm run lint` passes.
- [x] No behaviour change: `ORFARCHIV_DB_URL` remains the only connection variable.

## Result (2026-09-14)

Shipped in the `db` submodule on branch `self-hosted-db`, as two commits: the Vite build plus the
extensionless-import rewrite, then the unified CLI.

### Structure

```text
src/index.ts              root command; provides AppLive, NodeServices and the logger once
src/layers.ts             AppLive = Backup + Restore + Setup layers
src/commands/*.ts         CLI definitions only (flags/args → one service call)
src/services/env.ts       Environment: dbConnectionUrl, backupDir (_FILE indirection)
src/services/database.ts  Database: all MongoDB driver code
src/services/backup.ts    Backup: createBackup(), scheduleBackups(cron)
src/services/restore.ts   Restore: restore({ file?, batchSize, dryRun })
src/services/setup.ts     Setup: setup(); owns the index and search-index definitions
src/shared/               error.ts, logger.ts, search.ts
```

Services follow scraper's `Context.Service` + `defineService` + `layer` / `layerWithoutDependencies`
pattern. `Database.connect()` is a scoped `acquireRelease` that returns typed news operations
(`findAllNews`, `upsertNews`, `newsCollectionExists`, `createNewsCollection`, `createNewsIndexes`,
`listNewsSearchIndexNames`, `createNewsSearchIndex`). Callers scope it to one run, so there is still
one connection per backup run under `--keep-running`. Backup closes the connection before it
serialises and writes the file.

### Deviations from the plan above

- **Went further than a flat CLI:** command definitions are separate from the logic, which lives in
  services. The three copies of connect/close code became `Database.connect()` rather than a
  `withOrfArchivDb` helper.
- **File access uses Effect `FileSystem`** (in `Environment`, `Backup` and `Restore`) instead of
  `node:fs/promises`. Error messages are unchanged. The logged `Cause:` is now a `PlatformError`.
- **`--cron` is parsed at the CLI** with `Flag.mapTryCatch(Cron.parseUnsafe)`, so the service
  receives a `Cron.Cron`. An invalid expression now shows help and `Invalid value for flag --cron`
  (still exit 1) instead of a crash with a stack trace. It fails even without `--keep-running`.
- **`setup` now loads `.env` / `.env.local`**, because `dotenv.config()` runs once at the root. This
  fixes the latent bug listed in the README ahead of [S3](03-db-multi-target.md).
- **Boolean flags need `Flag.withDefault(false)`:** without it `effect/unstable/cli` treats them as
  required (`Missing required flag: --keep-running`).
- **CLI parse errors** such as an unknown flag or a bad integer exit 1. App failures are still logged
  and exit 0, as before.
- **Dockerfile:** the backup dir stays at `/app/backup`, so existing mounts keep working. It is
  created owned by uid 1000 and declared as a `VOLUME`.
- **`lint` now also runs `tsc --noEmit`**, as in scraper.
- `meow` remains in `package-lock.json` only as a transitive dependency of `semantic-release`.

### Verification evidence

- The devcontainer `news` collection was empty. 500 stories from `2026-09-02T030010Z.json` were
  restored into it with `--batch-size 200`.
- **Backup parity:** the pre-refactor `backup.ts` (run from a worktree of the previous commit) and
  `node dist/db.js backup` produced **byte-identical** files (119,324 bytes; keys `_id`, `id`,
  `category`, `source`, `timestamp`, `title`, `url`; no `titleEmbedding`). This was re-checked after
  every refactor round.
- **Restore:** `restore <file> --dry-run`, `restore --dry-run` (newest file in the backup dir) and a
  real batched write all worked.
- **Scheduling:** `--keep-running --cron "*/5 * * * * *"` produced 2 backups in 11 s. A scratch copy
  with a 1 ms timeout logged `Scheduled task ran into a timeout` each tick and kept running.
- **Failure paths:** an unreachable DB logs `Failed to connect to DB.` and exits 0, same as before.
  `ORFARCHIV_DB_URL_FILE` loads the URL. A missing `_FILE` logs a warning and falls back.
- **`npm start`** (bun) and `run.sh` work.
- **Runner-stage simulation:** in a clean directory with `npm ci --omit=dev` and only `db.js`,
  running as uid 1000, `--help`, `setup` and `backup` worked. The bundle imports only production
  dependencies.
- **Docker image:** built outside the devcontainer. Both `backup` and `setup` run from the image
  were successful.

### Follow-ups

- The CI still tags the image `orfarchiv-db-backup`, which no longer matches what the image does.
  Renaming it was out of scope.

## Verification

```bash
cd db
npm run build && node dist/db.js --help
node dist/db.js setup
node dist/db.js backup            # compare output shape against a pre-refactor file
node dist/db.js restore .backup/<file>.json --dry-run
npm run lint

docker build -t orfarchiv-db:test .
docker run --rm orfarchiv-db:test --help
docker run --rm orfarchiv-db:test setup      # impossible before this story
```

## Risks / open questions

- `effect/unstable/cli` is explicitly *unstable*; its API may shift between rc versions. The repo
  already pins `effect@4.0.0-rc.112` exactly, so this is contained — but note it, and re-check on any
  Effect bump.
- The extensionless-import rewrite is mechanical but touches every file in `src/`; keep it as its own
  commit inside the story so it is easy to review separately from the CLI restructure.
