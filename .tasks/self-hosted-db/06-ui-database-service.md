# S6 — `ui`: Effect `DatabaseService` + failover

**Owner:** Me   **Repo:** `ui`   **Size:** L
**Depends on:** [S2](02-shared-module.md)   **Blocks:** [S11](11-point-ui-reads-at-vps.md)
**Status:** ✅ Done (2026-09-27) — verified against two live atlas-local instances, see [Result](#result-2026-09-27)

## Goal

Replace the mutable `OrfArchivDb` class singleton with a proper Effect `DatabaseService` that holds
N targets, connects lazily, tracks per-target health, and fails over in priority order when a query
fails.

## Why

The UI's entire search layer is already Effect services — `NewsSearchService`,
`KeywordSearchService`, `SemanticSearchService`, `EmbeddingService`, all `Context.Service` + `Layer`.
Database access is the one thing that is not: a mutable class singleton in
`src/lib/backend/db/init.ts`, reached through a free function.

Bolting failover onto that singleton would mean hand-rolling lifecycle, health state and cleanup
outside the effect system. Making it a service lets the existing machinery do that work:
`Layer.scoped` closes clients, `Ref` holds health state, `Effect` combinators express the failover.

It also fixes three latent bugs and makes the search services unit-testable for the first time.

## Scope

**In scope**

- New `DatabaseService`; delete `init.ts`.
- Failover across targets in `useNewsCollection`.
- Layer wiring, call-site updates, `env.ts`, `hooks.server.ts`, `router.ts` error mapping.

**Out of scope**

- Configuring a second target on Vercel — that is [S11](11-point-ui-reads-at-vps.md). This ships
  with `ORFARCHIV_DB_URLS` unset and is a no-op.

## Technical notes

### Blast radius is small

The singleton has exactly two importers — `src/hooks.server.ts` and
`src/lib/backend/search/shared.ts` — and there are four `useNewsCollection` call sites.

### The service

```ts
export type DatabaseServiceShape = Context.Service.Shape<typeof DatabaseService>;
export class DatabaseService extends Context.Service<DatabaseService>()('db/DatabaseService', {
  make: Effect.gen(function* () {
    const targets = yield* resolveTargets;        // fails ONLY if nothing is configured
    const state = yield* Ref.make(initialState(targets));
    yield* Effect.addFinalizer(() => closeAll(state));
    return defineService({ targets, state });
  }),
}) {
  static readonly layerWithoutDependencies = Layer.scoped(this, this.make);
  static readonly layer = this.layerWithoutDependencies;
}
```

`Layer.scoped`, not `Layer.effect` as elsewhere, because clients need releasing — today nothing ever
closes them.

Shape: `useNewsCollection<A>(message, use): Effect<A, SearchError>` plus
`health: Effect<ReadonlyArray<TargetHealth>>`.

### Two traps

1. **Connections must be lazy and per-target.** A `ManagedRuntime` memoizes its layer build, so a
   layer that *fails* to build would poison every subsequent request. The layer must fail only on
   missing **configuration**, never on an unreachable database. Clients are opened on first use and
   memoized in the `Ref`.
2. **Provide `DatabaseService.layer` exactly once**, at `NewsSearchService.layer` — never inside each
   child layer, or you risk two service instances and two connection pools:

```ts
static readonly layer = this.layerWithoutDependencies.pipe(
  Layer.provide(KeywordSearchService.layerWithoutDependencies),
  Layer.provide(SemanticSearchService.layer),
  Layer.provide(DatabaseService.layer),
);
```

The existing `layerWithoutDependencies` / `layer` split is exactly the seam for this. (Effect
memoizes identical layer references within one build, so duplicating it would *probably* still
share — but relying on that is fragile.)

### Client options

Pass explicit `MongoClientOptions` — **currently none are passed at all**:
`serverSelectionTimeoutMS: 3000`, `connectTimeoutMS: 3000`, `retryReads: true`, an `appName`, and a
serverless-appropriate `maxPoolSize`. Without this a dead primary stalls a request for the driver's
30 s default, which exceeds the Vercel function budget.

Keep `maxPoolSize` small: a cold start should open one connection, not several
([S9](09-benchmark-and-gate.md) measures the cold-start cost).

### Failover

`useNewsCollection` folds over healthy targets in priority order. Each attempt is
`connect → run → Effect.timeout → Effect.tapError(markDown)`, chained to the next with
`Effect.catch`. If all fail, yield `SearchError` carrying the last cause plus the attempted labels.

Circuit breaker: `markDown` sets `downUntil = now + cooldown` (~30 s); a down target is skipped until
then and re-probed after. A working client whose *query* failed only flips the health flag — the
client is not torn down.

The per-attempt timeout matters: without it a hung primary consumes the whole request budget before
the secondary is even tried.

### Call-site updates

Mechanical, but three of them currently reach the DB from module scope and must move inside
`defineService` / `make`:

| File | Change |
| --- | --- |
| `search/shared.ts` | Delete `useNewsCollection` and the singleton import. `escapeRegExp`, `isStoryEntity`, `mapToStory`, `parseDate` stay — so the existing `shared.spec.ts` is unaffected |
| `search/keyword.ts` | `searchNews` is module-level; move inside `defineService({ db })` |
| `search/semantic.ts` | `fetchVocabulary` is a module-level `const Effect`; make it a function of `db` constructed inside `make`, next to the existing `Effect.cachedInvalidateWithTTL` call |
| `search/news.ts` | `findStoryByUrl` moves inside `defineService` |

### The three bug fixes

- **`hooks.server.ts`: drop `await orfArchivDb.init()` entirely.** The `ManagedRuntime` builds the
  layer on first query, so there is nothing to initialise per request. This structurally removes both
  a failed connect throwing out of `handle` and 500-ing *every* route (including prerendered pages),
  and the race where two concurrent requests both enter `init()`. The hook has no other
  responsibility and can be reduced or removed.
- **`router.ts`:** map `SearchError` to `TRPCError` `SERVICE_UNAVAILABLE` for `news.search` and
  `news.checkUpdates`. Today only `news.content` handles failure, so a total outage escapes
  `runtime.runPromise` as an unhandled rejection. 503 is right for the client's existing `retryLink`,
  which skips 4xx and retries 5xx.

### `env.ts`

Add `ORFARCHIV_DB_URLS` as an optional string (not URL-checked — it is a list) and make
`ORFARCHIV_DB_URL` optional. The lost build-time validation is replaced by `resolveTargets` failing
loudly in the layer.

### Consistency note

If targets diverge, consecutive requests could hit different databases and see slightly different
results — most visibly in `news.checkUpdates`, which compares latest timestamps. The priority-ordered
circuit breaker keeps everything pinned to the primary unless it is actually down, making this rare
rather than impossible. `db verify` ([S4](04-db-sync-and-verify.md)) keeps drift small.

## Acceptance criteria

- [x] With `ORFARCHIV_DB_URLS` unset, behaviour is identical to today.
- [x] Primary query fails → secondary serves the request; the user sees no error.
- [x] All targets fail → `SearchError` naming every attempted label → tRPC 503 (not an unhandled rejection).
- [x] A hanging target trips the per-attempt timeout, not the request budget.
- [x] A down target is skipped while `downUntil` holds and re-probed afterwards.
- [x] The scoped layer closes every opened client on release.
- [x] The layer builds successfully when **no** target is reachable, and fails only when none is **configured**.
- [x] `hooks.server.ts` no longer calls `init()`; an unreachable database does not 500 prerendered routes.
- [x] `DatabaseService.layer` is provided exactly once; only one pool per target.
- [x] Credentials appear in no log line.
- [x] `npm run check`, `npm run test:unit`, `npm run lint` pass.

## Verification

New `src/lib/backend/db/database.spec.ts` against a stub target driver, covering each criterion
above.

**Newly possible:** search-service specs via `Layer.succeed(DatabaseService, stub)` — `keyword.ts`
and `semantic.ts` tested against a scripted stub with no Mongo at all. This is impossible today
because the DB arrives through a module singleton, and it is a large part of the value of this story.

Manual, with two atlas-local instances in the devcontainer:

```bash
cd ui
ORFARCHIV_DB_URLS="<A>
<B>" npm run dev

# search works; then:
docker stop <A-instance>
# search still works, logs show the fallback, no 500s, prerendered pages still load
docker start <A-instance>
# after the cooldown, traffic returns to A
```

## Risks / open questions

- `Effect.firstSuccessOf` over pre-tapped attempts is the tidier spelling of the failover fold if the
  rc's API supports it; a manual `Effect.catch` fold is the fallback. Same semantics either way.
- Vercel's function lifecycle means the scoped layer's finalizer may not run on container freeze.
  That is acceptable — the driver's own socket handling covers it — but do not rely on the finalizer
  for correctness.

## Result (2026-09-27)

Implemented in `ui` on branch `self-hosted-db`. `npm run check`, `npm run test:unit` (184 tests),
`npm run lint` and `npm run build` pass.

### What changed

| Area | Change |
| --- | --- |
| `DatabaseService` | New `src/lib/backend/db/database.ts`. Targets come from `ORFARCHIV_DB_URLS`, falling back to `ORFARCHIV_DB_URL` (same precedence as `scraper`); the layer fails with `DatabaseConfigError` only when neither is set. Per-target state (client, `established`, `downUntil`) lives in a `Ref`; a finalizer closes every client. Exposes `useNewsCollection` and `health` |
| Clients | Created lazily on first use with `new MongoClient` (no I/O; the driver auto-connects), installed through `Ref.modify` so there is exactly one per target. Options: `serverSelectionTimeoutMS`/`connectTimeoutMS` 3000, `retryReads`, `appName: 'orfarchiv-ui'`, `maxPoolSize: 2` |
| Failover | `Effect.firstSuccessOf` over the candidates in priority order. Each attempt has a 5 s `DB_QUERY_TIMEOUT`; a failure sets a 30 s `DB_TARGET_COOLDOWN` and logs a redacted warning. If every target fails, `SearchError` carries the last cause and all attempted labels in a new `targets` field |
| Call sites | `keyword.ts`, `semantic.ts` (`fetchVocabulary(database)`) and `news.ts` (`findStoryByUrl`) take the service in `make`. `useNewsCollection` removed from `shared.ts`. `DatabaseService.layer` is provided once, at `NewsSearchService.layer` |
| Removed | `db/init.ts` and `hooks.server.ts` |
| `router.ts` | `news.search` and `news.checkUpdates` map `SearchError` to `SERVICE_UNAVAILABLE` (503) |
| `env.ts` | `ORFARCHIV_DB_URL` optional, `ORFARCHIV_DB_URLS` added (optional string) |
| Dev config | `.env` sets both URLs to `orfarchiv-db-1`/`orfarchiv-db-2`, like `db` and `scraper` |
| Tests | `database.spec.ts` (16 tests, fake `mongodb` driver + `TestClock`) and `keyword.spec.ts`, the first search spec against a stubbed `DatabaseService` |

### Deviations

- **`Layer.effect`, not `Layer.scoped`.** effect `4.0.0-rc.112` has no `Layer.scoped`;
  `Layer.effect` runs `make` in the layer's scope, so the finalizer works as intended.
- **All targets in cooldown → all are tried anyway.** Otherwise a single blip on a single-target
  setup would fail every request for the whole cooldown, breaking "identical to today".
- **A client that never connected is torn down on failure.** The task says a failed query only
  flips the health flag. That holds for a client that has served a query before — the driver
  reconnects it by itself. But when a client's *first* operation fails, the driver closes its
  topology permanently (`MongoTopologyClosedError: Topology is closed` on every later call), so a
  target that was down on first use would never recover without a restart. Such a client is now
  closed and replaced on the next attempt. Found during live verification.

### Verified

Against `orfarchiv-db-1` and `orfarchiv-db-2` in the devcontainer, with `npm run dev`:

- **Both up:** search, `checkUpdates` and the prerendered pages `/`, `/settings`, `/bookmarks`
  return 200; only db-1 holds `orfarchiv-ui` connections.
- **db-1 stopped:** the first search returns 200 after 3.2 s (server-selection timeout, then db-2);
  one warning names `orfarchiv-db-1`. Within the cooldown, requests take ~0.1 s and skip db-1
  without further warnings. Prerendered pages stay at 200.
- **db-1 started again:** after the cooldown, 5 of 5 searches are served by db-1 (measured through
  per-instance `opcounters`).
- **Both stopped:** search and `checkUpdates` return 503 `SERVICE_UNAVAILABLE` in ~6 s (3 s per
  target), with no unhandled rejection; prerendered pages stay at 200.
- **Both started again, same server process** (clients first created while both were down):
  search recovers immediately with 200, served by db-1.
- **Credentials:** none in any log line.

### Notes for [S11](11-point-ui-reads-at-vps.md)

- With every target unreachable, a request takes about 3 s per target before the 503, so two
  targets cost ~6 s of the function budget.
- `ORFARCHIV_DB_URL` is now optional; S11 only needs to set `ORFARCHIV_DB_URLS`.
