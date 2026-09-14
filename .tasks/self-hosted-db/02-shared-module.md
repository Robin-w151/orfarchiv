# S2 — `orfarchiv-shared` module

**Owner:** Both (you create the repo, I do the code)   **Repo:** new + all three   **Size:** M
**Depends on:** [S1](01-db-cli-and-build.md)   **Blocks:** [S3](03-db-multi-target.md), [S5](05-scraper-multi-target-writes.md), [S6](06-ui-database-service.md)

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
| `db` | `src/shared/common/` | `./shared/common/search` |
| `scraper` | `src/shared/common/` | `../shared/common/search` |
| `ui` | `src/lib/shared/common/` | `$lib/shared/common/search` |

### Integration details

- **Extensionless imports throughout.** Enabled by [S1](01-db-cli-and-build.md): once `db` bundles,
  all three consumers bundle, so no consumer needs `allowImportingTsExtensions`. This is why S1 comes
  first.
- The three CI workflows need `submodules: recursive` on their `actions/checkout` steps, or
  `npm run lint` fails on missing imports.
- Nested submodules mean `git clone --recursive` / `git submodule update --init --recursive`. Add a
  line to each README.

## Acceptance criteria

- [ ] `orfarchiv-shared` repo exists with `targets.ts`, `search.ts`, `embedding.ts` and specs.
- [ ] Added as a submodule at the three paths above; all three repos build and lint.
- [ ] The duplicated originals are **deleted**, not left orphaned.
- [ ] `submodules: recursive` added to all three CI workflows, and CI is green in each.
- [ ] Shared repo has its own lint + test CI, passing.
- [ ] No behaviour change anywhere — same constants, same `quantize()` output.
- [ ] READMEs mention the recursive clone.

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
