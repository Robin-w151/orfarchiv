# S0 — Spike: atlas-local with auth + `$vectorSearch`

**Owner:** You   **Repo:** infra (no code)   **Size:** S
**Depends on:** nothing   **Blocks:** [S7](07-vps-mongodb-stack.md)
**Status:** ✅ Done (2026-09-13) — `$vectorSearch` works with SCRAM, see [Result](#result-2026-09-13)

## Goal

Determine whether `mongodb/mongodb-atlas-local` still builds and serves `$vectorSearch` once SCRAM
authentication is enabled — and record the exact configuration that works.

## Why

The VPS database will be reachable from the public internet (Vercel has no static egress IPs to
allowlist), so it **must** have authentication. But the atlas-local image runs two processes:
`mongod` and `mongot`, the latter serving Atlas Search and `$vectorSearch`. `mongot` has to
authenticate to `mongod` internally. If enabling root credentials breaks that handshake, semantic
search silently stops working on the self-hosted target.

This decides S7's entire security design, it is cheap to answer now, and it is expensive to discover
halfway through building the production stack. **Do this first, on day one.**

## Scope

**In scope**

- Stand up atlas-local locally (or on the VPS) with `MONGODB_INITDB_ROOT_USERNAME` /
  `MONGODB_INITDB_ROOT_PASSWORD` set.
- Create the `news_title_vector` index and prove a `$vectorSearch` query returns results.
- Create a least-privilege application user and prove it works too.
- Write down the working compose snippet and the image digest tested.

**Out of scope**

- TLS (that is S7 — this spike is plaintext on a private network).
- The real dataset. A handful of synthetic documents is enough.

## Technical notes

The vector index definition to reproduce, from `db/src/setup.ts`:

```js
{
  name: 'news_title_vector',
  type: 'vectorSearch',
  definition: {
    fields: [
      { type: 'vector', path: 'titleEmbedding', numDimensions: 256, similarity: 'cosine' },
      { type: 'filter', path: 'timestamp' },
      { type: 'filter', path: 'source' },
      { type: 'filter', path: 'category' }
    ]
  }
}
```

`.devcontainer/docker-compose.yml` is the working reference for an *unauthenticated* atlas-local
(volumes `/data/db` and `/data/mongot`). The spike adds credentials to that.

Points to watch:

- The image declares its own `HEALTHCHECK`; `depends_on: condition: service_healthy` relies on it.
  Confirm the container still reports healthy with auth on.
- Search index creation is **asynchronous**. `listSearchIndexes()` reports a status — wait for it to
  become queryable rather than assuming it is ready after `createSearchIndex()` returns.
- Users to create: one `readWrite` on `orfarchiv` (scraper, sync) and one `read` (UI, backup).
  `$vectorSearch` needs only read privileges.

### If the answer is "no"

Fallback is mTLS at the TLS proxy with `mongod` left unauthenticated behind it. That is noticeably
worse: the Vercel side has to write a client PEM to `/tmp` at cold start. Capture *why* it failed in
enough detail to choose between that and other options (e.g. a keyfile supplied explicitly).

## Acceptance criteria

- [x] A documented yes/no on whether `$vectorSearch` works with SCRAM enabled.
- [x] The image tag **and digest** tested are recorded.
- [x] If yes: a working compose snippet, plus the commands that created both users.
- [x] If yes: evidence that a `read`-only user can execute `$vectorSearch`.
- [x] ~~If no: the failure mode captured (logs from both `mongod` and `mongot`), and a recommendation.~~ n/a
- [x] Result written back into this file, and S7 updated if the answer is no.

## Result (2026-09-13)

**Yes — `$vectorSearch` works with SCRAM enabled**, for root and for both least-privilege users.

- Image: `mongodb/mongodb-atlas-local:8.3.3`
- Digest: `mongodb/mongodb-atlas-local@sha256:03256817c492ad78873c3727435c1f164c705e541d150322b47700217db5a7f9`
  (Docker Hub build `8.3.3-20260911T095853Z`)
- MongoDB server: `8.3.3` (FCV `8.3`), tested with mongosh `2.10.0`
- Healthcheck still passes with auth on: `orfarchiv-db-ui` (`depends_on: condition: service_healthy`) came
  up normally.
- An earlier run on a stale local `latest` (server `8.2.3`, digest `sha256:283bf0dc…`) gave identical
  results. It was superseded because the 8.2 line is no longer rebuilt on Docker Hub.

### Compose snippet

```yaml
orfarchiv-db:
  image: mongodb/mongodb-atlas-local:8.3.3@sha256:03256817c492ad78873c3727435c1f164c705e541d150322b47700217db5a7f9
  environment:
    - MONGODB_INITDB_ROOT_USERNAME=orfarchivdb
    - MONGODB_INITDB_ROOT_PASSWORD=orfarchivdb
  ports:
    - '27017:27017'
  volumes:
    - orfarchiv-db:/data/db
    - orfarchiv-db-mongot:/data/mongot
```

`MONGODB_INITDB_ROOT_*` is only applied when `/data/db` is empty.

### User creation

Run as root. Users live in `admin` so connection strings without a path need no `authSource`.

```js
use admin
db.createUser({ user: 'orfarchiv_rw', pwd: passwordPrompt(), roles: [{ role: 'readWrite', db: 'orfarchiv' }] })
db.createUser({ user: 'orfarchiv_ro', pwd: passwordPrompt(), roles: [{ role: 'read', db: 'orfarchiv' }] })
```

Connection string: `mongodb://<user>:<pw>@orfarchiv-db/?directConnection=true`

Idempotent version (creates or updates both users): [scripts/create-users.js](scripts/create-users.js).

### Scripts

All run with `npx mongosh '<url>' --file <script>`:

| Script | Run as | Purpose |
| --- | --- | --- |
| [create-users.js](scripts/create-users.js) | root, with `ORFARCHIV_RW_PASSWORD` / `ORFARCHIV_RO_PASSWORD` set | Create or update `orfarchiv_rw` / `orfarchiv_ro` |
| [seed.js](scripts/seed.js) | `orfarchiv_rw` | Replace `spike:*` docs with 30 synthetic int8-vector docs, wait until `news_title_vector` returns hits |
| [perm-test.js](scripts/perm-test.js) | each app user | 16 allow/deny checks; expectations derived from the user's role; exits non-zero on failure |

`perm-test.js` only touches throwaway `permtest*` collections and a `permtest:1` doc, so it is safe to run
against a database with real data. It needs at least one document with `titleEmbedding`.

### Permission evidence

Tested on a fresh volume:

1. Users created as root (above).
2. `npm run setup` in `db` run **as `orfarchiv_rw`**: collection, indexes and `news_title_vector` created
   without errors.
3. 30 synthetic docs seeded as `orfarchiv_rw` with int8 `titleEmbedding` vectors
   (`Binary.fromInt8Array`, as the scraper writes them). The index was `READY` and queryable after ~2s.
4. Each operation below run as both users. The query vector was the stored `titleEmbedding` of `spike:0`,
   which came back as the top hit with score `1`.

| Operation                                 | `orfarchiv_ro` (`read`) | `orfarchiv_rw` (`readWrite`) |
| ----------------------------------------- | ----------------------- | ---------------------------- |
| find / count                              | ok                      | ok                           |
| `$vectorSearch` (with and without filter) | ok                      | ok                           |
| `listSearchIndexes`                       | ok                      | ok                           |
| insert / delete                           | Unauthorized            | ok                           |
| `createIndex` / `dropIndex`               | Unauthorized            | ok                           |
| `createCollection` / `drop`               | Unauthorized            | ok                           |
| `createSearchIndex` / `dropSearchIndex`   | Unauthorized            | ok                           |
| read `admin.system.users`                 | Unauthorized            | Unauthorized                 |
| write to another database                 | Unauthorized            | Unauthorized                 |
| `usersInfo` / `createUser`                | Unauthorized            | Unauthorized                 |

Consequences for S7:

- `db/src/setup.ts` runs as `orfarchiv_rw`; setup does not need root or a custom role.
- App users are not created by the image; S7 needs a provisioning step for them.
- Pin tag **and** digest. Docker Hub rebuilds and re-pushes every tag (including exact patch tags like
  `8.3.3`) with new digests roughly weekly, so a tag alone does not identify the tested image. Re-run
  this spike when bumping the digest.
- mongosh `2.10.0` quirks (not server issues): it aborts with `Telemetry setup is missing userId or
  anonymousId` if `~/.mongodb/mongosh/config` lacks a telemetry ID (fix: `enableTelemetry: false`), and
  prints `TypeError: getAiAgent is not a function` on exit.

## Verification

```bash
# 1. Start atlas-local with credentials set, then:
mongosh "mongodb://root:<pw>@localhost:27017/?directConnection=true"

# 2. Seed, index, and query
use orfarchiv
db.news.insertOne({ id: 'test:1', title: 'x', source: 'news', timestamp: new Date(),
                    titleEmbedding: BinData(9, '<256-byte payload>') })
db.news.createSearchIndex(/* definition above */)
db.news.getSearchIndexes()          // wait for a queryable status
db.news.aggregate([{ $vectorSearch: { index: 'news_title_vector', path: 'titleEmbedding',
                                      queryVector: [...], numCandidates: 100, limit: 10 } }])

# 3. Repeat step 2's query as the read-only application user
```

Expect the aggregation to return the seeded document. An empty result with no error usually means
the index is not queryable yet — re-check `getSearchIndexes()` before concluding failure.

## Risks / open questions

- `mongot` behaviour with auth is version-specific; pin the digest you validate and reuse exactly
  that in S7.
- A `latest` tag that works today may not work at the next pull. S7 should pin the digest.
