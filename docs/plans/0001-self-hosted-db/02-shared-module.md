# S2 — `orfarchiv-shared` module

**Owner:** Both (you create the repo, I do the code)   **Repo:** new + all three   **Size:** M
**Depends on:** [S1](01-db-cli-and-build.md)   **Blocks:** [S3](03-db-multi-target.md), [S5](05-scraper-multi-target-writes.md), [S6](06-ui-database-service.md)
**Status:** ✅ Done (2026-09-14) — shared repo wired into all three consumers, see [Result](#result-2026-09-14)

## Goal

Create a fourth repo, `orfarchiv-shared`, consumed as a **git submodule of source** inside each of
the three existing repos — holding the constants and functions that must be byte-identical across
services, plus the new database-target parsing.

## Why

Three values are already copy-pasted across repos today, and one of them carries a comment saying it
must stay identical. All three services read and write **one database**, so a silent divergence
corrupts search results rather than failing loudly:

- `quantize()` — duplicated verbatim in `scraper/src/services/embedding.ts` and
  `ui/src/lib/backend/search/embedding.ts`, with the comment *"Must stay identical to the scraper's
  quantize()"*.
- `TITLE_EMBEDDING_DIMENSIONS` (256) — if these disagree, vectors written by one service are
  unreadable by another.
- `NEWS_TITLE_VECTOR_INDEX`, `TITLE_EMBEDDING_FIELD`.

The multi-target work adds a fourth thing to share (`parseTargets`), which is the trigger to fix the
pattern rather than extend it.

### Why a source submodule and not an npm package

| Constraint | Consequence |
| --- | --- |
| Each submodule's CI checks out **only its own repo** (no `submodules:` flag today) | A relative `file:../shared` dependency cannot resolve |
| All three Dockerfiles run `npm ci --ignore-scripts` | A git dependency that builds via a `prepare` script would silently install **unbuilt** |
| A published package would need compiled JS + `.d.ts` | A build pipeline and a 4-step release dance for ~150 lines |

Source-level sharing sidesteps all three. It also needs **no dependency declarations of its own**:
`quantize()` returns a `mongodb` `Binary`, and since the files compile inside each consumer, that
resolves against the consumer's own `mongodb`. No peer-dep management.

A further argument specific to this content: independent semver versions would *permit* `ui@1.0` and
`scraper@1.1` to disagree at runtime — exactly the failure mode being prevented. A pinned submodule
SHA is the stronger guarantee here.

## Scope

**In scope**

- Create the repo (yours) and its contents (mine).
- Wire it as a submodule into all three repos; delete the duplicated originals.
- `submodules: recursive` in the three CI workflows.
- A minimal `package.json` + vitest + lint/test CI in the shared repo. No build, no release pipeline.

**Out of scope**

- Unifying the `_FILE` env-loading logic. It is implemented in each repo (Effect + `FileSystem` in
  `db` and `scraper` since [S1](01-db-cli-and-build.md), and shell), and unifying those is a separate
  concern. Only target *parsing* is shared; *loading* stays per-repo.
- Any Effect imports in the shared module — it exports plain functions and constants, and each
  consumer wraps them in its own idiom.

## Technical notes

### Contents

| File | Exports | Replaces |
| --- | --- | --- |
| `targets.ts` | `parseTargets`, `labelOf`, `redact` | *(new)* |
| `search.ts` | `TITLE_EMBEDDING_FIELD`, `TITLE_EMBEDDING_DIMENSIONS`, `NEWS_TITLE_VECTOR_INDEX`, `isEmbeddable` | `db/src/shared/search.ts`, `scraper/src/shared/config.ts`, and the matching half of `ui/src/lib/configs/server.ts` |
| `embedding.ts` | `quantize` | the verbatim duplicate in `scraper/src/services/embedding.ts` and `ui/src/lib/backend/search/embedding.ts` |

### `parseTargets`

```ts
export interface Target { readonly url: string; readonly label: string; }

// Splits on newline or ';' — NEVER comma: replica-set URIs legally contain commas,
// e.g. mongodb://a:27017,b:27017/
export function parseTargets(raw: string): ReadonlyArray<Target>;

// Host[:port] with credentials stripped — safe for logs, filenames and --target values.
export function labelOf(url: string): string;
```

Entries are trimmed, blanks skipped, duplicates dropped, order preserved (highest priority first).

### Mount points

All inside `src/`, so every Dockerfile already copies them — `db` copies `./src/shared/`, `scraper`
copies `.`, `ui` copies `src/`. **No Dockerfile changes needed.**

| Repo | Path | Import |
| --- | --- | --- |
| `db` | `src/shared/common/` | `#common/search` |
| `scraper` | `src/shared/common/` | `#common/search` |
| `ui` | `src/lib/shared/common/` | `$common/search` |

### Integration details

- **Extensionless imports throughout.** Enabled by [S1](01-db-cli-and-build.md): once `db` bundles,
  all three consumers bundle, so no consumer needs `allowImportingTsExtensions`. This is why S1 comes
  first.
- The three CI workflows need `submodules: recursive` on their `actions/checkout` steps, or
  `npm run lint` fails on missing imports.
- Nested submodules mean `git clone --recursive` / `git submodule update --init --recursive`. Add a
  line to each README.

## Acceptance criteria

- [x] `orfarchiv-shared` repo exists with `targets.ts`, `search.ts`, `embedding.ts` and specs.
- [x] Added as a submodule at the three paths above; all three repos build and lint.
- [x] The duplicated originals are **deleted**, not left orphaned.
- [ ] `submodules: recursive` added to all three CI workflows, and CI is green in each.
- [x] Shared repo has its own lint + test CI, passing.
- [x] No behaviour change anywhere — same constants, same `quantize()` output.
- [x] READMEs mention the recursive clone.

## Result (2026-09-14)

Shipped as the public repo [`orfarchiv-shared`](https://github.com/Robin-w151/orfarchiv-shared)
(commit `6e44aa5`). It is wired into `db`, `scraper` and `ui` on branch `self-hosted-db`, and is also
a fourth root submodule at `shared/`, where it is developed.

### Structure

```text
src/search.ts        NEWS_TITLE_VECTOR_INDEX, TITLE_EMBEDDING_FIELD, TITLE_EMBEDDING_DIMENSIONS, isEmbeddable
src/embedding.ts     quantize
src/targets.ts       Target, parseTargets, labelOf, redact
src/*.spec.ts        35 tests
package.json         lint (prettier + eslint + tsc), test (vitest); no runtime dependencies
.github/             CI (lint + test) and Dependabot, both copied from scraper
.husky/              commit-msg (commitlint) and pre-commit (lint-staged + tests)
```

### Wiring per consumer

| Repo | Mount | Import | Resolution |
| --- | --- | --- | --- |
| `db` | `src/shared/common/` | `#common/search` | `package.json` `"imports": { "#common/*": "./src/shared/common/src/*.ts" }` |
| `scraper` | `src/shared/common/` | `#common/search` | same as `db` |
| `ui` | `src/lib/shared/common/` | `$common/search` | `sveltekit({ alias })` in `vite.config.ts` and `vite.storybook.config.ts` |

In each consumer:

- `.gitmodules` uses the HTTPS URL.
- `actions/checkout` has `submodules: recursive`.
- The `image` jobs run `git submodule update --init --recursive` after `git checkout v<version>`,
  because checking out a tag does not update the submodule's files.
- ESLint ignores the mount folder.

### Deviations from the plan above

- **Sources live in `src/`** inside the shared repo, not at its root. The aliases hide the extra
  path level.
- **Imports use an alias** (`#common` / `$common`) rather than relative paths. `db` and `scraper`
  use Node subpath imports, which `tsc`, Vite and Bun all resolve with no config change. `ui` uses a
  SvelteKit alias, like its existing `$lib`.
- **`ui` keeps its own naming only for non-shared config.** `NEWS_TITLE_EMBEDDING_FIELD` and
  `NEWS_TITLE_EMBEDDING_DIMENSIONS` became the shared `TITLE_EMBEDDING_FIELD` and
  `TITLE_EMBEDDING_DIMENSIONS`.
- **`isEmbeddable` no longer uses Effect `Schema`.** It is now
  `typeof title === 'string' && title.trim().length > 0`, which gives the same result for all the
  scraper's existing spec cases.
- **`quantize` finds its maximum with filter + reduce** instead of a loop. It still skips `NaN`
  components like the loop did, and a spec now pins that.
- **Consumers ignore `src/**/shared/common/` in ESLint.** ESLint 10 lints nested files with the
  nearest `eslint.config.js`, so consumers would otherwise load the shared repo's config. That broke
  in `ui`, which lacks `eslint-plugin-prettier`, and caused typescript-eslint `tsconfigRootDir`
  errors in `db` and `scraper`. The shared repo lints itself in its own CI.
- **`db/tsconfig.json` excludes the shared specs and `vitest.config.ts`**, because `db` has no
  Vitest. `scraper` and `ui` need no tsconfig change, and their Vitest runs the shared specs as well.
- **The root superproject also mounts the repo at `shared/`**, and `install-deps.sh` installs it.

### `targets.ts` semantics

- `parseTargets` splits on `\n`, `\r\n` or `;`, never on `,`. It trims entries, skips blanks, drops
  exact duplicates and preserves order.
- `labelOf` reads the authority as plain text instead of using `new URL`, which cannot parse
  multi-host URIs. For example, `mongodb://u:p@a:27017,b:27017/db` becomes `a:27017,b:27017`, and
  `mongodb+srv://u:p@c.x.net/` becomes `c.x.net`.
- `redact(text)` replaces the credentials of every MongoDB URI in a string with `***`, so driver
  error messages are safe to log.

### Verification evidence

- **shared:** `npm run lint` and `npm run test` (35 tests) pass. GitHub CI is green on `main`.
- **db:** lint and build pass. The bundle inlines the constants. `node dist/db.js --help` and
  `bun run src/index.ts --help` both work, so `#common/*` resolves for `npm start` as well.
- **scraper:** lint, build and tests pass (51, including the 3 shared spec files).
  `bun run src/index.ts --help` works.
- **ui:** lint passes. `svelte-check` reports 0 errors across 1329 files. Unit tests pass (165,
  including the shared specs). The build passes, and the CSP hash check leaves the tree clean.
- **Vercel:** the preview deployment of `ui` `self-hosted-db` built and works, so Vercel fetches the
  HTTPS submodule.
- **Fresh recursive clones** of all three `self-hosted-db` branches passed CI's own steps: `npm ci`,
  then lint, plus the `db` build, the `scraper` tests and the `ui` check and unit tests. All three pin
  `6e44aa5`.
- **No duplicates remain:** outside `shared/common`, `grep` finds only imports and usages of the shared
  names.

### Follow-ups

- **Consumer CI** runs only on PRs and pushes to `main`/`develop`, so it runs for the first time when
  the `self-hosted-db` PRs are opened. The `image` job's submodule step is first exercised by the next
  release.
- **Bumping `shared`** means updating the pin in all three consumers. A `gitsubmodule` Dependabot entry
  in each consumer would automate those PRs.
- **Label collisions:** two targets with the same host but different credentials or database get the
  same label. This matters in [S3](03-db-multi-target.md), where labels become backup paths and
  `--target` values.

## Verification

```bash
# After wiring, the constants must exist in exactly one place per repo:
grep -rn "TITLE_EMBEDDING_DIMENSIONS\|function quantize" db/src scraper/src ui/src
# => only hits under src/**/shared/common/

cd db && npm run lint && npm run build
cd ../scraper && npm run lint && npm run test
cd ../ui && npm run check && npm run test:unit

# Fresh-clone check (catches a missing submodules: recursive in CI):
git clone --recursive <repo> /tmp/fresh && cd /tmp/fresh && npm ci && npm run lint
```

`parseTargets` specs: newline and `;` separators, surrounding whitespace, blank entries, duplicates,
**replica-set URIs containing commas**, and credential redaction in labels.

## Risks / open questions

- Nested submodules are the main ergonomic cost — a forgotten `--recursive` produces confusing
  missing-import errors. The fresh-clone check above is the guard.
- Decide public vs. private for the new repo before creating it. Private adds no friction here
  (source submodule over SSH), unlike a private npm registry would.
