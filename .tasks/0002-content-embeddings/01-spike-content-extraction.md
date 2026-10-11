# 01: Spike: content extraction and fusion

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Done
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
- [x] Findings are recorded in this file under a `## Findings` heading, with numbers for items 1–5 and yes/no plus a working pipeline snippet for item 6.
- [x] A recommendation is given for: the truncation limit, the extra noise selectors, a minimum text length below which a teaser counts as `failed` (or none).
- [x] Any finding that contradicts the epic's assumptions (for example a hit rate below 90% for old years) is listed as an open question in the epic README.
- [x] No production system is touched, and no code in `shared`, `scraper`, `db` or `ui` changes. The spike scripts are in `.tasks/0002-content-embeddings/scripts/`.

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

## Findings
Measured on 2026-10-11 in the devcontainer against the local DB (443,279 stories) and the local llama.cpp server (`--batch-size 2048 --ubatch-size 2048`, 14 CPU cores visible). Scripts: `scripts/spike-{sample,fetch,extract,tokens,index}.ts`, shared helpers in `scripts/spike-lib.ts`. Run them in that order from `scripts/` with `npx tsx <script>`. `SPIKE_OUT` sets the output directory (default `/tmp/orfarchiv-spike`); the sample is re-used unless `spike-sample.ts --resample` is passed, and `spike-extract.ts --extra` applies the recommended extra selectors.

### 1. Availability
300 stories, 60 per year, spread evenly over the 17 sources (16–19 each). Fetched at 10 pages/s in 31 s with User-Agent `orfarchiv-spike (+https://orfarchiv.news)`. No 429/403.

| Year | Pages | 200 | Hit rate |
|------|-------|-----|----------|
| 2022 | 60 | 59 | 98% |
| 2023 | 60 | 60 | 100% |
| 2024 | 60 | 60 | 100% |
| 2025 | 60 | 58 | 97% |
| 2026 | 60 | 60 | 100% |
| **All** | **300** | **297** | **99%** |

- Per source: 100% everywhere except `help`, `oe3` and `science` (one 404 each, 94–95%).
- The 3 misses are plain `404` on the original URL (`oe3:3027963`, `science:3232346`, `help:3229580`), i.e. deleted stories. Story 06 marks them `failed`.
- **No redirects at all.** Every story URL is still served at its original address, so story 06 does not need redirect handling beyond what `fetch` does by default.

### 2. Extraction quality
Pipeline as in the UI (jsdom → `removePrintWarnings`, `removeVideo`, `removeMoreToReadSection` → drop `div.embed.migsys` → Readability with the UI's `classesToPreserve` → re-parse → drop `nav` → `textContent`, one line per block element).

- **Empty results: 0 of 297** in every year. Readability always finds the article.
- No site navigation, footer, share links, cookie banners or "Mehr zum Thema" boxes leak into the text (the `nav` and `#more-to-read` removal already covers them).
- Leftover noise, by markup family (there are two, both present in all years 2022–2026, so the split is by site, not by era):

| Markup | Sites | Leftover in text | Pages (of 297) | Selector |
|--------|-------|------------------|----------------|----------|
| `story-lead` / `story-story` | regional sites, `news`, `oesterreich`, `sport`, `science`, `religion` | date line, "(Update: …)", "Dieser Artikel ist älter als ein Jahr." | 195–228 | `.story-meta-dates` |
| both | all | screen-reader text "Fotostrecke mit N Bildern" | 17 | `.sr-only` |
| `storyText` | `fm4`, `oe3`, `help` | image credits ("… / picturedesk.com", "APA/AFP/…") | ~40 | `p.credit` |
| `storyText` | `fm4` | "Publiziert am …" and "Seitenanfang" | 19 | `.storyMeta`, `p.toplink` |
| `storyText` | `fm4`, `oe3` | "Sendungsübersicht" back link | 3 | `p.backlink` |
| `storyText` | `fm4` | removed audio player ("Dieses Element ist nicht mehr verfügbar") | 1 | `div.remote` |

With these 7 selectors removed before Readability, all of the listed noise is gone (0 pages), no page became empty and the largest relative text loss on any page was 18% (short regional stories losing only their date line).

Residual noise that is **not** worth a selector: byline/agency lines ("red, kaernten.ORF.at", "(APA/dpa/KG)"), the ö3/help footer "Dieser Beitrag begleitet die Sendung …", and a rare related-stories "Links:" list (1 page). They are short and topical. The story keyword (`div.keyword`, e.g. "Chronik", "Tennis") stays as the first line, which is useful for retrieval. Figure captions stay, as they describe the content.

A by-eye check of 20 random outputs (all sources, all years) after the extra selectors showed clean article text: lead, subheads and body, no boilerplate.

### 3. Teaser pages
`findReadMoreUrl` fires on **6 of 297 pages (2%)**: 2× `sport`, 2× `news` (pointing to regional sites), `burgenland`, `tirol`. Their extracted text is 290–840 chars (40–113 words, 94–208 tokens incl. title), a full 2–4 sentence summary of the linked article plus a "Mehr dazu in …" line. They are long enough to be useful as they are.

Text length overall (chars, after extra selectors): p10 872, p50 1,944, p90 5,098; minimum 291 (a teaser). Shortest per source median: `sport` 877, longest `fm4` 5,813.

### 4. Length
Tokens of `title: <title> | text: <body>` via `POST /tokenize`, 297 pages:

| p10 | p50 | p90 | p99 | max | > 512 | > 1024 | > 2048 |
|-----|-----|-----|-----|-----|-------|--------|--------|
| 242 | 500 | 1,262 | 2,306 | 3,263 | 48% | 15% | 1% |

Throughput on 46 pages with ≥ 1,024 tokens, truncated with `/tokenize` + `with_pieces: true`, two runs each (second run shown, first within ±10%):

| Limit | Batch | Tokens/s | Docs/min at full length | Docs/min on real length mix |
|-------|-------|----------|-------------------------|-----------------------------|
| 512 | 1 | 2,394 | 279 | 340 |
| 512 | 8 | 3,245 | 379 | 461 |
| 512 | 32 | 3,169 | 370 | 450 |
| 1024 | 1 | 2,919 | 171 | 312 |
| 1024 | 8 | 2,811 | 164 | 301 |
| 1024 | 32 | 2,916 | 171 | 312 |

"Real length mix" uses the mean of `min(tokens, limit)` over the sample: 422 tokens at 512, 561 at 1024. The server is compute-bound at ≈ 3k tokens/s; going from 512 to 1024 costs ≈ 1.4× per article on the real mix (≈ 450 vs ≈ 310 docs/min).

### 5. Throughput (uncapped, laptop, lower bound)
At 1,024 tokens the local server embeds ≈ 310 docs/min regardless of batch size (1, 8 or 32 all within noise; batching helps only for short inputs). The full archive of 443k stories would take **≈ 1 day of pure embedding time** on this machine. **This is an uncapped laptop number and a rough lower bound only.** The VPS has 4 vCPU shared with mongod/mongot, and the content instance will be capped (story 07), so expect several times slower there; the epic's ≥ 25 docs/min target corresponds to ≤ 12 days. Batch size 8 is a reasonable default for story 06 (no gain from more, keeps requests short).

### Recommendations
- **Truncation limit: 1,024 tokens** (of `title: <title> | text: <body>`). It covers 85% of articles completely and the lead plus several paragraphs of the rest, at ≈ 1.4× the cost of 512. 512 would cut half of all articles. 2,048 is not worth it: only 15% of articles are longer than 1,024 and news front-loads the content.
- **Extra noise selectors** (remove before Readability, text extraction only): `.story-meta-dates`, `.sr-only`, `p.credit`, `.storyMeta`, `p.toplink`, `p.backlink`, `div.remote`. Some of these (dates, credits) are shown by the UI today, so story 02 should apply them on the embedding path only, not in the UI's presentation pipeline.
- **Minimum text length: none for teasers.** Teasers carry a real summary (≥ 290 chars in the sample). Count a page as `failed` only on HTTP errors (404) or empty extraction. Optionally keep a defensive floor of 100 chars of body text against broken pages; it would have affected 0 of 297 pages.

### 6. Index and fusion
All on `orfarchiv-db-1` (`mongodb-atlas-local:8.3.3`) in the scratch collections `news_spike` (5,000 newest stories) and `news_spike_full` (`$out` of all 443k stories), both dropped at the end. Afterwards `news` had the same document count and the same `news_title_vector` definition, still `READY` and queryable. Only 4 of the 5,000 newest stories were in the item 2 sample, so `contentEmbedding` was filled from 768-dim **title** embeddings for the rest (int8, same `quantize()`), as the story allows.

- **Two vector paths with different `numDimensions`: yes.** This definition builds and both paths answer queries with the filters:
  ```js
  {
    fields: [
      { type: 'vector', path: 'titleEmbedding', numDimensions: 256, similarity: 'cosine' },
      { type: 'vector', path: 'contentEmbedding', numDimensions: 768, similarity: 'cosine' },
      { type: 'filter', path: 'timestamp' },
      { type: 'filter', path: 'source' },
      { type: 'filter', path: 'category' },
    ],
  }
  ```
  ```js
  { $vectorSearch: { index, path: 'contentEmbedding', queryVector /* int8, 768 */, numCandidates: 100, limit: 5,
                     filter: { timestamp: { $gte: since } } } }
  ```
  Documents without `contentEmbedding` are simply not candidates on that path; they still match on `titleEmbedding`.
- **Rebuild time on the full collection: 18 s** until `queryable: true` for 443,272 title vectors plus 5,000 content vectors (the situation in story 07, before the backfill). With a 768-dim vector on **every** story (upper bound for a later rebuild, vectors re-used cyclically from the 5k set) it took **36 s**. Right after `queryable: true`, 49–50 of 50 random stories found themselves as top hit on each path, so the index is really complete at that point. Copying the collection with `$out` took 1.2 s.
  These are laptop numbers (14 cores, otherwise idle). The VPS has 4 shared vCPU, so expect a few minutes rather than seconds, which is still far below the epic's 15-minute threshold. A drop-and-recreate on `news` is acceptable; the second-index-name workaround is not needed.
- **`$rankFusion`:** not re-run. Done on 2026-10-11 on a scratch DB, see the fused pipeline in story 08 (works on 8.3.3, score floors after fusion via `scoreDetails`).
- **`$vectorSearch` on a path that is not in the index: fails**, it does not return empty:
  ```
  code 8 (UnknownError): Executor error during aggregate command on namespace: orfarchiv.news_spike :: caused by :: contentEmbedding is not indexed as vector
  ```
  Related cases:
  - querying the 768-dim path with a 256-dim vector also fails with code 8: `vector field is indexed with 768 dimensions but queried with 256`.
  - a `$vectorSearch` against an index name that does not exist does **not** fail; it returns `[]`.

  For the UI (story 08): an opted-out target is detectable because the fused query fails with code 8 and a message containing `is not indexed as vector`. Since code 8 is generic, match on the message, or better, decide the mode from config (the excluded-targets list) and treat this error only as a fallback signal to retry title-only. A typo in the index name would silently return no results, so it is not a usable signal.

### Epic assumptions
No finding contradicts the epic's assumptions: story URLs resolve (99%, ≥ 97% in every year, no redirects), the important text fits into 1,024 tokens for 85% of articles, and the rebuild is far below 15 minutes. The epic README's risks on old markup, the rebuild outage and the teaser minimum were updated with these numbers; the user then decided on 2026-10-11: truncation at 1,024 tokens, no minimum text length.
