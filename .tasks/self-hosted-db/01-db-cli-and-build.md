# S1 — `db`: Vite build + unified Effect CLI

**Owner:** Me   **Repo:** `db`   **Size:** L
**Depends on:** nothing   **Blocks:** [S2](02-shared-module.md)

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

- [ ] `npm run build` produces `dist/db.js`.
- [ ] `db --help` lists `setup`, `backup`, `restore`; each subcommand's `--help` documents its flags.
- [ ] `db backup` against the devcontainer Mongo produces a file identical in shape to the
      pre-refactor output, and `db restore` reads that file back.
- [ ] `db backup --keep-running --cron "..."` still schedules, and still swallows a timeout with a
      warning rather than exiting.
- [ ] The rebuilt image runs `backup --keep-running` by default **and** can be invoked as
      `docker run … setup` — which the current image cannot do at all.
- [ ] `meow` is gone from `package.json`.
- [ ] `npm run lint` passes.
- [ ] No behaviour change: `ORFARCHIV_DB_URL` remains the only connection variable.

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
