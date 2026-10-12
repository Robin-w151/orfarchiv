# 03: Content dimension evaluation

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** 02
**Estimate:** M

## User story
As the product owner, I want the content vector dimension chosen from measured retrieval quality and cost, so that we don't pay 3× storage for no gain, or lose quality to save a few MB.

Unblocks 04, which fixes `CONTENT_EMBEDDING_DIMENSIONS`.

## Description
Build an offline evaluation script `.tasks/0002-content-embeddings/scripts/eval-content-dimensions.ts`, run with `npx tsx` from that directory (it uses the `package.json` set up in story 01). It is not part of any module's CLI or build. It imports `extractArticleText` from `shared/src/storyContent.ts` (root `shared` submodule); bare imports inside `shared` resolve against `shared/node_modules`, which has the devDependencies from story 02.

1. **Sample.** Take ~2,000 stories from the local DB, stratified by year and source, with a fixed random seed. Fetch at most 10 pages/s, the same rate as the production job (≈ 3–4 minutes for 2,000 pages). Cache the HTML on disk under the scratchpad so reruns don't refetch. Extract the body with the shared `extractArticleText` from story 02.
2. **Embed.** Embed each body in two formats, truncated to the 1,024-token limit from story 01, at the full 768 dims:
   - **(A) production** `title: <title> | text: <body>` (the format story 04 adds to `shared` as `toContentDocumentInput`; inline it here, since 04 comes later), used for the paraphrase queries and for the decision;
   - **(B) body-only** `title: none | text: <body>`, used only for the title-as-query test, where (A) would be trivially easy.

   Derive 256, 512 and 768 variants of both with the shared `quantize()` after slicing.
3. **Known-item retrieval (format B).** Use each story's title as a query, embedded with the query prompt from `ui/src/lib/backend/search/embedding.ts` (`toQueryInput`) and normalized with `normalizeQuery`. Rank all ~2,000 content vectors by brute-force cosine in memory. Report recall@1, recall@10 and MRR per dimension.
4. **Paraphrase queries (format A).** Generate one query per sampled story (~2,000) from its lead sentence: 2–3 nouns chosen deterministically (for example the longest capitalized words that are not in the title), so the query doesn't just repeat the title. Report each metric with a 95 % bootstrap confidence interval (1,000 resamples, fixed seed).
5. **Cost.** For each dimension, report the vector bytes for the full corpus (437k × dims), the estimated HNSW overhead (`437k × (dims + ~2 × M × 4 B)` with the default `M = 16`, so ≈ 128 B of graph links per vector; check it against the index size reported for the `news_spike` collection from story 01 where possible), and the measured embedding time per document (the dimension doesn't change model cost, so state this explicitly).
6. **Recommendation.** Pick the smallest dimension whose recall@10 on format (A) paraphrase queries is within 1 point of 768, or whose 95 % CI overlaps 768's. If none qualifies, recommend 768. Quality is the only criterion; cost is reported for information (confirmed by the user). Write the results table and the recommendation into a `## Results` section of this file and ask the user to confirm. The story stays `In review` until the user has confirmed; story 04 must not start before.

## Acceptance criteria
- [x] The script runs end to end against the local devcontainer services with a fixed seed and gives the same numbers on a rerun from the cache.
- [x] `## Results` contains recall@1, recall@10 and MRR for 256, 512 and 768 for both query sets, with 95 % CIs, plus the storage and RAM estimates.
- [x] The user has confirmed a dimension, and it is recorded in this file and in the epic README (Background or Assumptions).
- [x] Pages that fail to fetch or extract are counted and excluded, and the counts are reported.
- [x] Given the embedding server still runs with the default batch size, when the script starts, then the probe fails and the script aborts with a message naming the missing `--ubatch-size` flag.

## Technical notes
- Reuse: `quantize` (`shared/src/embedding.ts`) by import. `normalizeQuery`, `capitalize` and `toQueryInput` are copied into the script from `ui/src/lib/backend/search/embedding.ts`, because that module imports SvelteKit aliases (`$app/env/private`, `$lib/configs/server`). Copy the constants they use too: `SEMANTIC_SEARCH_MIN_NOUN_LENGTH = 4` and `SEMANTIC_SEARCH_ACRONYM_MAX_LENGTH = 7` (`ui/src/lib/configs/server.ts`).
- **Prerequisite:** the devcontainer's `orfarchiv-embeddings` service runs with `--batch-size 2048 --ubatch-size 2048` (story 00, a dependency via 01). `/props` doesn't report the batch size (only `n_ctx`), so at startup the script sends one probe input of exactly the truncation limit in tokens (checked via `/tokenize`) and aborts if the server answers HTTP 500 `input (N tokens) is too large to process`.
- Cosine on int8: dot product divided by the norms, computed on `Int8Array` values.
- Embedding endpoint: `POST <ORFARCHIV_EMBEDDING_URL>/embeddings` with `{ input: [...] }`, batch size from story 01.

## Testing
- Manual: one run on the full sample. No automated tests; the script is kept in the epic's `scripts/` for reruns.

## Out of scope
- Fusion weights and thresholds (story 09).
- Changing title dimensions.

## Results
Measured on 2026-10-11 in the devcontainer against the local DB and the local llama.cpp server (`--batch-size 2048 --ubatch-size 2048`). Script: `scripts/eval-content-dimensions.ts`, run from `scripts/` with `npx tsx eval-content-dimensions.ts`. `EVAL_OUT` sets the cache and output directory (default `/tmp/orfarchiv-eval`). The first run took ≈ 25 minutes (fetching 207 s, embedding ≈ 15 min). A rerun from the cache takes 11 s and produces a byte-identical `results.json`.

**Sample.** 2,000 stories with seed `20261011`: ids per year × source bucket (2022–2026 × 17 sources) sorted, shuffled with a seeded PRNG, 23–24 per bucket, no bucket short. Fetched at 10 pages/s with User-Agent `orfarchiv-eval (+https://orfarchiv.news)`, no 429/403.
- Excluded: **19 pages with HTTP 404** (1 %) and **0 extraction failures** (`empty`/`parse`). That leaves **1,981 stories** evaluated.
- Truncated at 1,024 tokens: 271 inputs in format (A) (14 %) and 262 in (B), consistent with story 01's 15 %.

**Paraphrase queries.** The 2–3 longest capitalized, non-sentence-initial words of length ≥ 4 that are not in the title, taken from the first sentence of the first paragraph with ≥ 8 words. If that sentence has fewer than 2, the whole paragraph is used. 15 stories without 2 candidates are excluded, leaving 1,966 queries. Examples: "Corona-Pandemie Skiweltcup-Rennen Semmering", "Börsenaufsicht ETFs", "Wohnhaus Rennweg Katschberg".

Ranks are pessimistic on ties. CIs are 95 % bootstrap (1,000 resamples, fixed seed). The last column is the paired bootstrap CI of the difference to 768, in percentage points.

**Title as query, format (B) body-only**, 1,981 queries against 1,981 docs:

| Dims | recall@1 % (95 % CI) | recall@10 % (95 % CI) | MRR (95 % CI) | Δ recall@10 vs 768, pp (95 % CI) |
|------|------|------|------|------|
| 256 | 86.5 (84.9–88.0) | 96.9 (96.2–97.6) | 0.902 (0.891–0.914) | −2.7 to −1.3 |
| 512 | 90.4 (89.0–91.7) | 98.9 (98.4–99.3) | 0.935 (0.925–0.944) | −0.3 to +0.3 |
| 768 | 91.1 (89.8–92.4) | 98.9 (98.4–99.3) | 0.941 (0.932–0.949) | – |

**Paraphrase queries, format (A) production** (decision set), 1,966 queries against 1,981 docs:

| Dims | recall@1 % (95 % CI) | recall@10 % (95 % CI) | MRR (95 % CI) | Δ recall@10 vs 768, pp (95 % CI) |
|------|------|------|------|------|
| 256 | 59.2 (56.9–61.2) | 82.7 (81.1–84.3) | 0.677 (0.658–0.694) | −10.5 to −7.9 |
| 512 | 68.2 (66.1–70.1) | 90.3 (88.9–91.6) | 0.763 (0.746–0.778) | −2.5 to −0.8 |
| 768 | 70.6 (68.6–72.4) | 91.9 (90.6–93.1) | 0.782 (0.766–0.796) | – |

**Cost** for 437k stories, int8 vectors, HNSW links ≈ 437k × 2 × M × 4 B with M = 16, i.e. 128 B per vector:

| Dims | Vectors MB | HNSW links MB | mongot RAM est. MB |
|------|-----------|---------------|--------------------|
| 256 | 112 | 56 | 168 |
| 512 | 224 | 56 | 280 |
| 768 | 336 | 56 | 392 |

- Embedding time (format A, batch 8, laptop): **201 ms/doc**. The dimension doesn't change it: the model always computes 768 dims and the result is sliced afterwards.
- The HNSW estimate couldn't be checked against `news_spike`, because story 01 dropped that collection.
- All options fit the 8 GB VPS easily. M0 never stores content vectors (story 05).

**Recommendation: 512.**
- 256 is clearly worse: −9 pp recall@10 on paraphrases, and its CI doesn't overlap 768's.
- 512 qualifies by the CI-overlap rule (88.9–91.6 vs 90.6–93.1), but not by the 1-point rule: it is 1.6 pp below 768. The paired CI of the difference (−2.5 to −0.8 pp) excludes 0, so 768 is measurably, if slightly, better on paraphrase queries.
- On title-as-query, 512 and 768 are equal in recall@10.

By the rule in this story the answer is 512. If the 1.6 pp matter more than the 112 MB, 768 is the alternative, since cost is not a criterion.

**Decision (user, 2026-10-11): `CONTENT_EMBEDDING_DIMENSIONS = 512`.**
