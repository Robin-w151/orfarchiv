# S0 — Spike: atlas-local with auth + `$vectorSearch`

**Owner:** You   **Repo:** infra (no code)   **Size:** S
**Depends on:** nothing   **Blocks:** [S7](07-vps-mongodb-stack.md)

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

- [ ] A documented yes/no on whether `$vectorSearch` works with SCRAM enabled.
- [ ] The image tag **and digest** tested are recorded.
- [ ] If yes: a working compose snippet, plus the commands that created both users.
- [ ] If yes: evidence that a `read`-only user can execute `$vectorSearch`.
- [ ] If no: the failure mode captured (logs from both `mongod` and `mongot`), and a recommendation.
- [ ] Result written back into this file, and S7 updated if the answer is no.

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
