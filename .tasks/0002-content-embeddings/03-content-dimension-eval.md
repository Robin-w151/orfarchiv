# 03: Content dimension evaluation

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Todo
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
- [ ] The script runs end to end against the local devcontainer services with a fixed seed and gives the same numbers on a rerun from the cache.
- [ ] `## Results` contains recall@1, recall@10 and MRR for 256, 512 and 768 for both query sets, with 95 % CIs, plus the storage and RAM estimates.
- [ ] The user has confirmed a dimension, and it is recorded in this file and in the epic README (Background or Assumptions).
- [ ] Pages that fail to fetch or extract are counted and excluded, and the counts are reported.
- [ ] Given the embedding server still runs with the default batch size, when the script starts, then the probe fails and the script aborts with a message naming the missing `--ubatch-size` flag.

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
