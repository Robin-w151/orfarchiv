# 06: embed-content scraper command

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 02, 04, 05
**Estimate:** L

## User story
As the operator, I want a long-running scraper command that slowly fetches orf.at articles and stores their content embeddings, newest first, so that the whole archive and every new story eventually gets a content vector without stressing orf.at or slowing down regular scraping.

## Description
Add a new subcommand `embed-content` next to `scrape` and `backfill-embeddings`.

**Selection.** Per batch, query the **first content-enabled target** for stories matching `{ contentStatus: null, url: { $gt: '' } }`, sorted `{ timestamp: -1 }` (uses the `content_status_timestamp` index from story 04), limited to `--batch-size` (default 20). Newest first means new stories are picked up on the next tick and history drains behind them.

**Per story:**
1. Fetch `url` through a new `StoryPageFetcher` service (pattern of `scraper/src/services/scraper.ts`). Send a User-Agent header from `ORFARCHIV_CONTENT_USER_AGENT` (ask the user for the exact string while implementing). Retry on 5xx and network errors with backoff, and treat 404/410 as terminal.
2. Call the shared `extractArticleText(html, url)`. Read-more links are **not** followed: a teaser page is embedded as it is, because in the UI the reader decides whether the linked article is loaded.
3. Build the input with `toContentDocumentInput(title, body)` and truncate it to `CONTENT_MAX_TOKENS = 1024` (decided after story 01, in `scraper/src/shared/config.ts`) via llama.cpp's `/tokenize` with `with_pieces: true`. One call returns every token with its text piece (checked on 2026-10-09: `{"tokens":[{"id":238255,"piece":"Ö"},…]}`). If the input has more tokens than the limit minus a small margin for special tokens (for example 8), join the pieces of the first tokens up to that count and use that as the input. Because the title comes first in the input, only the body is cut. If the last kept piece isn't valid UTF-8 (llama.cpp then returns it as a byte array), drop it. An HTTP 500 `input (N tokens) is too large to process` after truncating is a bug: log it with the story id and treat it as transient.
4. Embed through the existing `Embedding` service. Generalize `embed` so the caller supplies the input format and dimension (titles: `toDocumentInput`, 256; content: `toContentDocumentInput`, `CONTENT_EMBEDDING_DIMENSIONS`). Rate-limit with `ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT` / `_WINDOW` instead of `ORFARCHIV_EMBEDDING_RATE_LIMIT` / `_WINDOW`. The limiter store is per process (`RateLimiter.layerStoreMemory`), so `scrape` is unaffected regardless; contention on the embedding server is handled by the separate CPU-capped instance in story 07.

**Write.** Write `{ $set: { contentEmbedding, contentStatus: CONTENT_STATUS.embedded } }`, or on a terminal failure (404/410, not an article, nothing extracted; there is no minimum text length, so any non-empty text is embedded) `{ $set: { contentStatus: CONTENT_STATUS.failed } }`, logging the reason, to **all content-enabled targets** (story 05), matched by `id`. A target that fails is logged and skipped, as in `persistOrfNews`. Transient errors (timeouts, 5xx after retries, embedding server down) write nothing, so the story is retried in a later batch. If the embedding server is down, end the batch early instead of burning orf.at fetches, and wait `--idle-interval` before the next one.

**Rate limits.** `ORFARCHIV_CONTENT_FETCH_RATE_LIMIT` / `ORFARCHIV_CONTENT_FETCH_RATE_WINDOW` (default 10 per second, as confirmed by the user on 2026-10-10) cover all orf.at requests. Reaching that rate needs concurrent fetches: fetch a batch with bounded concurrency (for example 10), paced by the limiter, then embed it. At this rate the CPU-capped embedding server, not orf.at, sets the actual throughput. Content embedding has its own `ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT` / `_WINDOW`.

**Flags:** `--poll` (keep running: process batches back to back, with the orf.at rate limiter as the only pacing; when a query returns fewer stories than `--batch-size`, i.e. the backlog is drained, or a batch ended early, wait `--idle-interval` before querying again), `--idle-interval` (default `1 minute`), `--batch-size` (default 20), `--max-docs` (stop after N processed), and the global `--target` (for example a new target): selection and writes then use only that target, and an excluded target is rejected with an error.

**Interaction with `scrape`.** When `buildStoryUpdate` retitles a story, it leaves `contentEmbedding` and `contentStatus` as they are. Re-embedding edited articles is a non-goal. `persistOrfNews` inserts new stories without content fields, so `embed-content` picks them up.

**Logging.** Per batch: processed, embedded, failed (split by reason: unavailable, empty), transient failures and duration, using the `Effect.withLogSpan` pattern of `backfill`. Every N batches, log the remaining backlog (a `countDocuments` on the selection filter).

**Docs.** Add a README section in `scraper` ("Content embeddings") with the command, flags and env variables. Update the Dockerfile only if a new default is needed. The production container will override `command:`.

## Acceptance criteria
- [ ] Given 50 local stories without content, when `npm start -- embed-content --max-docs 50` runs, then each has either `contentStatus: 'embedded'` with a `contentEmbedding` of `CONTENT_EMBEDDING_DIMENSIONS` int8 values, or `contentStatus: 'failed'`, on content-enabled targets only.
- [ ] Given a 404 page (stubbed), then the story gets `contentStatus: 'failed'`, the log names the reason `unavailable`, and it isn't selected again.
- [ ] Given a teaser page with a read-more link, then exactly one page is fetched and the teaser's own text is embedded.
- [ ] Given the embedding server is unreachable, then no `contentStatus` is written, the batch ends early, and the next batch after `--idle-interval` retries the same stories.
- [ ] Given a body longer than `CONTENT_MAX_TOKENS` (stubbed `/tokenize`), the embedded input has at most `CONTENT_MAX_TOKENS` minus the margin in tokens, starts with the full `title: <title> | text: ` prefix, and ends at a token boundary.
- [ ] Given a body shorter than the limit, the input is sent unchanged.
- [ ] orf.at requests never exceed the configured rate (asserted with `TestClock` in specs).
- [ ] `embed-content` reads `ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT` / `_WINDOW` and ignores `ORFARCHIV_EMBEDDING_RATE_LIMIT` (spec on the environment wiring).
- [ ] With `--target <EXCLUDED_LABEL>`, the command exits 1 with an error naming the label and fetches nothing.
- [ ] With `--poll` and a backlog, batches run back to back without an idle wait; with an empty backlog, the next query happens after `--idle-interval` (both with `TestClock`). A failing batch is logged and doesn't stop the loop.
- [ ] `scrape` retitles don't remove `contentEmbedding`.
- [ ] Lint and tests are green, and the README is updated.

## Technical notes
- New: `scraper/src/commands/embed-content.ts`, `scraper/src/services/fetcher.ts` (`StoryPageFetcher`, + spec), `scraper/src/services/content.ts` (orchestration + spec).
- Changed: `scraper/src/services/embedding.ts` (parameterize the input formatter and dimension), `scraper/src/services/database.ts` (selection and content writes, reusing the target fan-out of `persistOrfNews`), `scraper/src/services/env.ts`, `scraper/src/commands/index.ts`, `scraper/README.md`.
- Follow the existing patterns: `Context.Service` with `make` / `layer`, tagged errors in `scraper/src/shared/errors.ts`, and `RateLimiter.makeWithRateLimiter` with `onExceeded: 'delay'` as in `embedding.ts`.
- Tokenize URL: `/tokenize` lives at the llama.cpp server root, while `ORFARCHIV_EMBEDDING_URL` points at `…/v1` (`/v1/tokenize` returns 404). Derive the root by removing a trailing `/v1` segment from `ORFARCHIV_EMBEDDING_URL`; send the bearer token there too.
- Index for selection: `content_status_timestamp` from story 04. Confirm with `explain()` on the local full copy that a batch query examines no more than `--batch-size` documents.

## Testing
- Unit: fetcher status handling and retry; one fetch per story, also for teaser pages; truncation via stubbed `/tokenize` (short input, long input, non-UTF-8 last piece); terminal vs transient classification; per-target writes respecting `content: false`; rate limiting with `TestClock`.
- Manual: run against the devcontainer DBs and the local llama.cpp server with `--max-docs 200`, then spot-check vectors with `$vectorSearch` on `contentEmbedding`.

## Out of scope
- Running it in production (story 07).
- Re-embedding when articles change.
