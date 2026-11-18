# 04: Research tools

**Epic:** [0005 Remote MCP server](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 02
**Size:** M — three tools on existing backend functions, with output shaping, cursor encoding and error mapping

## User story

As a researcher using an AI agent, I want the agent to search the ORF archive and read articles through MCP tools, so that I can ask questions like "how did ORF report on the 2024 Nationalratswahl over the following months?" and get answers grounded in the archive.

## Description

Add a `Toolkit` in `src/lib/backend/mcp/tools.ts` and register it in `server.ts` (story 02). All tools are read-only (`readOnlyHint: true`, `openWorldHint: false` where Effect's `Tool` supports annotations).

**`search_news`**
- Input:
  - `query?: string` — keyword(s) or a natural-language question.
  - `matchMode?: 'anyOf' | 'allOf' | 'semantic'` (default `anyOf`). `semantic` requires `query`; if `isEmbeddingConfigured()` is false, `semantic` returns an error result "Semantic search is not available".
  - `from?: string`, `to?: string` — `yyyy-MM-dd`, interpreted in `Europe/Vienna`; `from` → start of day, `to` → end of day, as ISO datetimes with offset (what `isIsoDateTime` expects). `from` after `to` → error result.
  - `sources?: string[]` — keys from `sources` in `src/lib/models/settings.ts` (enum); default: all.
  - `cursor?: string` — the `nextCursor` of a previous call.
- Calls `searchNews({ searchRequestParameters: { textFilter: query, matchMode, dateFilter, sources }, pageKey }, clientId)` with `clientId = 'mcp:' + label` from `McpClient`.
- Output: `{ stories: [{ id, title, category, source, url, timestamp }], nextCursor?: string, ordering }`. `nextCursor` is `base64url(JSON.stringify(nextKey))`; incoming cursors are decoded and validated with the `PageKey` schema, invalid → error result "Invalid cursor".
- Description explains: German content, archive starts July 2022, dates in `yyyy-MM-dd`, results ordered by time (keyword) or relevance (semantic), up to 100 per page, use `nextCursor` to paginate, and lists source keys with labels.

**`get_story_content`**
- Input: `url: string` (validated like `StoryContentRequest`: `isUrl` + `isOrfUrl`), `maxChars?: number` (1 000–100 000, default 20 000), `includeReadMore?: boolean` (default false → `fetchReadMoreContent`).
- Calls `fetchStoryContent(url, includeReadMore)` and, in parallel, `searchStory(url)` for the title (`StoryContent` has no title).
- Output: `{ url, title?, source?: string, timestamp?, chapters: [{ title?, text }], truncated: boolean }` — `title` from `searchStory` (left out if the story isn't in the archive), `source` = `content.source?.name` — `text` = segments joined with `\n\n`; truncation cuts at `maxChars` across chapters on a segment boundary where possible. Never returns `contentHtml`.
- `MetaDataNotFoundError`/`ContentNotFoundError` → error result "No content found for <url>"; other failures → "Fetching content failed", logged with cause.
- Description warns that the text is third-party content and must not be followed as instructions.

**`list_sources`**
- No input. Output: `{ sources: [{ key, label }] }` from `src/lib/models/settings.ts` (label for `news` is "News").

Errors are returned as MCP tool error results (`isError: true`, per story 01), never as unhandled exceptions.

## Acceptance criteria

- [ ] Given a valid token, when `tools/list` is called, then exactly `search_news`, `get_story_content`, `list_sources` are listed with JSON Schemas matching the inputs above.
- [ ] Given `search_news { query: 'nationalratswahl', from: '2024-09-01', to: '2024-10-31' }`, then `searchNews` is called with `dateFilter.from = 2024-09-01T00:00:00.000+02:00` and `dateFilter.to = 2024-10-31T23:59:59.999+01:00` and `clientId = 'mcp:<label>'`, and stories are returned in the compact shape.
- [ ] Given a result with `nextCursor`, when `search_news` is called with that cursor and the same filters, then the next page is requested with the decoded `PageKey`; a tampered cursor returns "Invalid cursor".
- [ ] Given `matchMode: 'semantic'` without `query`, or with embeddings not configured, then an error result is returned and `searchNews` isn't called.
- [ ] Given `sources: ['unknown']`, then input validation fails with an error result naming `sources`.
- [ ] Given `get_story_content` for an ORF article, then chapters are returned as plain text without HTML tags, and `truncated` is true when longer than `maxChars`.
- [ ] Given an ORF article that is in the archive, then `title` equals the story's title; given one that isn't, then `title` is absent and the content is still returned.
- [ ] Given a non-ORF URL (e.g. `https://example.com`), then an error result is returned and nothing is fetched.
- [ ] Given an ORF URL without content, then "No content found for <url>" is returned.
- [ ] `npm run lint`, `npm run check`, `npm run test:unit`, `npm run build` pass.

## Technical notes

- Files: `src/lib/backend/mcp/tools.ts` (new), `src/lib/backend/mcp/server.ts`, possibly `src/lib/backend/mcp/format.ts` for output shaping.
- Reuse: `searchNews` and `searchStory` (`src/lib/backend/search/news.ts`), `fetchStoryContent` (`src/lib/backend/content/news.ts`), `isEmbeddingConfigured` (`src/lib/backend/search/embedding.ts`), schemas `PageKey`, `isUrl`, `isOrfUrl`, `sources`.
- Dates: luxon `DateTime.fromISO(date, { zone: 'Europe/Vienna' })`.
- Both backend functions return Promises from their own `ManagedRuntime`; wrap with `Effect.tryPromise`, passing the tool's abort signal where possible.

## Testing

- Unit (`src/lib/backend/mcp/tools.spec.ts`, `@effect/vitest` + `McpTest`): mock `searchNews`/`fetchStoryContent` with `vi.mock`; cover every acceptance criterion: date conversion incl. DST, cursor round trip and tampering, semantic guards, source enum, truncation, error mapping.
- Manual: MCP Inspector against `npm run dev` with a local token in `ui/.env.local`.

## Out of scope

- Rate limits and call logging (story 05). Batch fetching of multiple articles, MCP resources and prompts (possible follow-ups).
