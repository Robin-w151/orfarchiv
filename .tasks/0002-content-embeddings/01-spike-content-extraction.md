# 01: Spike: content extraction and fusion

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 00
**Estimate:** M

## User story
As the developer of this epic, I want measured facts about orf.at article pages, embedding throughput and MongoDB's fusion support, so that stories 02–08 are designed on data instead of guesses.

Unblocks 02 (extraction design), 03 (input length), 04 (index shape) and 08 (fusion strategy).

## Description
This is an investigation with no production code. Scripts are stored in `.tasks/0002-content-embeddings/scripts/` (prefix `spike-`, as in epic 0001's `scripts/`), so the measurements can be repeated. Cached HTML and other bulky outputs go to the scratchpad, not the repo. The deliverable is a **findings section appended to this file**.

Answer the following:

1. **Availability.** Sample about 300 stories from the local DB, stratified by year (2022–2026, ~60 per year; the archive starts 2022-07-06) and by `source`. Fetch at the confirmed rate of 10 pages/s (≈ 30 seconds) and record the HTTP status, redirects and final URL. Report the hit rate per year and source.
2. **Extraction quality.** For each page, run the current UI pipeline steps relevant to text: jsdom → `removePrintWarnings`, `removeVideo`, `removeMoreToReadSection` → drop `div.embed.migsys` charts → Readability → `removeSiteNavigation` → `textContent`. Report the empty-result rate, and look at 20 random outputs by eye for leftover junk (footers, "Mehr zum Thema", share links, image credits). List the extra selectors needed per era of markup.
3. **Teaser pages.** Measure the share of pages where `findReadMoreUrl` (UI) fires, for example regional or `news.orf.at` teasers, and their extracted text length. They are embedded as they are, without following the link (the reader decides in the UI whether to load it), so report whether their text is long enough to be useful.
4. **Length.** Report the token-count distribution (p50/p90/p99) of `title: <title> | text: <body>`, using the llama.cpp `/tokenize` endpoint. Story 00 configured the dev server with `--batch-size 2048 --ubatch-size 2048`, so inputs up to the model's 2048-token context work. Compare embedding throughput for inputs truncated to 512 and to 1024 tokens, and recommend a truncation limit.
5. **Throughput.** Measure uncapped throughput (docs/min, tokens/s) on the local llama.cpp server at the chosen input length and batch sizes 1, 8 and 32, as a rough lower bound for the archive duration (mark the estimate as such). CPU caps can't be tested from the devcontainer (no `docker` CLI), and laptop numbers don't transfer to the VPS, so the cap is calibrated in story 07.
6. **Index and fusion.** On local `mongodb-atlas-local:8.3.3` (`orfarchiv-db-1`), use a scratch collection `news_spike` so the dev index stays untouched: copy ~5,000 recent stories with `$out`, embed the bodies extracted in item 2 (or the titles, if there are too few) into `contentEmbedding` at 768 dims, and build the test index there. Drop the collection at the end.
   - Create a test index with two `vector` paths of different `numDimensions` (256 and 768) plus the existing filters, and confirm it builds.
   - Recreate the two-path index on a copy of the full local collection (443k stories, title vectors plus 768-dim test vectors on part of it) and measure the time until `queryable: true`. This is the semantic search outage in story 07; in-place updates don't work (re-tested 2026-10-06, see story 04).
   - `$rankFusion`: done on 2026-10-11 on a scratch DB (results in story 08). It works on 8.3.3, score floors must be applied after fusion via `scoreDetails`.
   - Check whether a `$vectorSearch` on a path missing from the index fails or returns empty. This tells the UI how to detect opted-out targets.

## Acceptance criteria
- [ ] Findings are recorded in this file under a `## Findings` heading, with numbers for items 1–5 and yes/no plus a working pipeline snippet for item 6.
- [ ] A recommendation is given for: the truncation limit, the extra noise selectors, a minimum text length below which a teaser counts as `failed` (or none).
- [ ] Any finding that contradicts the epic's assumptions (for example a hit rate below 90% for old years) is listed as an open question in the epic README.
- [ ] No production system is touched, and no code in `shared`, `scraper`, `db` or `ui` changes. The spike scripts are in `.tasks/0002-content-embeddings/scripts/`.

## Technical notes
- Current pipeline: `ui/src/lib/backend/content/news.ts`, `transform/cleanup.ts`, `transform/anchor.ts` (`findReadMoreUrl`), `transform/chart.ts`, `transform/readability.ts`.
- Local services: `.devcontainer/docker-compose.yml` (`orfarchiv-db-1`, `orfarchiv-embeddings` on port 3003).
- Scripts need `jsdom`, `@mozilla/readability`, `mongodb` and `tsx`. Give `.tasks/0002-content-embeddings/scripts/` its own `package.json` with these, because bare imports from `.tasks/` don't resolve against any submodule's `node_modules`. Install with plain `npm install` in that directory.
- Tokenize: `POST <server root>/tokenize` with `{ "content": "<text>" }`, i.e. `ORFARCHIV_EMBEDDING_URL` without `/v1` (`/v1/tokenize` returns 404). Story 06 truncates with the same endpoint and `with_pieces: true`.
- MongoDB docs: `$rankFusion` (https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion/) and vector index definitions (https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-type/).

## Testing
- None. This is a spike; the scripts are kept for reruns, not tested.

## Out of scope
- Production code (stories 02, 06 and 08).
- Choosing the content dimension (story 03).
