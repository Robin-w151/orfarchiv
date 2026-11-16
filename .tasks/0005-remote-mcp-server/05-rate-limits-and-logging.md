# 05: Per-client rate limits and logging

**Epic:** [0005 Remote MCP server](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 04
**Size:** S — reuses the existing `RateLimiter` pattern from the embedding service; one middleware and two env vars

## User story

As the owner of ORF Archiv, I want each token limited to a reasonable number of tool calls and every call logged with its token label, so that a runaway agent can't drive up Vercel or embedding costs and I can see which client did what.

## Description

- Add `ORFARCHIV_MCP_RATE_LIMIT` (calls per window, default 120) and `ORFARCHIV_MCP_RATE_WINDOW` (default `1 minute`) to `src/env.ts`, parsed like `ORFARCHIV_EMBEDDING_RATE_LIMIT`/`_WINDOW`: move the private `parseRateLimit`/`parseRateWindow` from `src/lib/backend/search/embedding.ts` to `src/lib/backend/shared/rateLimit.ts`, export them and use them in both places. Defaults go into `src/lib/configs/server.ts`.
- MCP middleware (around every tool call, via `McpServer.middleware` or a wrapper per tool, per story 01) that uses `RateLimiter` with `layerStoreMemory`, key `mcp:${label}`, algorithm `token-bucket`, `onExceeded: 'fail'`. When exceeded, the tool returns an error result "Rate limit exceeded, retry in <seconds>s" and the backend isn't called.
- Calls are weighted by cost (`tokens` option of `RateLimiter`):
  - `get_story_content`: 5 units (fetches and parses an ORF page)
  - `search_news` with `matchMode: 'semantic'`: 3 units (calls the embedding server)
  - everything else, including keyword `search_news`: 1 unit
- Log every tool call with `logger.info('mcp-tool-call', …)`: label, tool name, duration, outcome (`ok` / `error:<reason>` / `rate-limited`), and for `search_news` the match mode and result count. No tokens, no full article text, no query text longer than 200 chars.

## Acceptance criteria

- [ ] Given `ORFARCHIV_MCP_RATE_LIMIT=3`, when a token calls `list_sources` four times within the window, then the fourth call returns the rate-limit error result and the first three succeed.
- [ ] Given two tokens, then each has its own budget.
- [ ] Given `get_story_content` with a limit of 10, then the third call within the window is rejected.
- [ ] Given `search_news` with `matchMode: 'semantic'` and a limit of 10, then the fourth call within the window is rejected, while keyword `search_news` calls count 1 each.
- [ ] Given unset env vars, then defaults 120 per `1 minute` apply.
- [ ] Given any tool call, then one `mcp-tool-call` log line with label, tool, duration and outcome is written, and it contains no token.
- [ ] `npm run lint`, `npm run check`, `npm run test:unit` pass.

## Technical notes

- Files: `src/env.ts`, `src/lib/configs/server.ts`, `src/lib/backend/mcp/server.ts`, `src/lib/backend/mcp/tools.ts`, `src/lib/backend/shared/rateLimit.ts` (new), `src/lib/backend/search/embedding.ts`.
- Pattern: `EmbeddingService.layer` in `src/lib/backend/search/embedding.ts` (`RateLimiter.makeWithRateLimiter`, `RateLimiter.layerStoreMemory`).
- The in-memory store is per Vercel instance; that's accepted (see epic risks).

## Testing

- Unit (`src/lib/backend/mcp/rateLimit.spec.ts` or in `tools.spec.ts`): the criteria above with a small limit and Effect's `TestClock` for the window; log output via a spy on `logger.info`.

## Out of scope

- A shared rate-limit store across instances, per-token custom limits.
