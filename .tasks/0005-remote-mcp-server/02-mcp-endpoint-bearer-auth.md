# 02: MCP endpoint with bearer auth

**Epic:** [0005 Remote MCP server](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 01
**Size:** M — new route, server module, env var and security-relevant auth middleware, each needing careful tests

## User story

As the owner of ORF Archiv, I want an MCP endpoint at `/api/mcp` that only answers clients with a valid bearer token, so that I can give agents access without opening the server to everyone.

## Description

Create branch `feat/mcp-server` in `ui` from `develop`. Use the transport decided in story 01 (expected: `McpServer.layerHttpRequestScoped` with `McpProtocol.v2026_07_28`).

**Env var.** Add `ORFARCHIV_MCP_TOKENS` to `src/env.ts` (optional string, server-only, description: "MCP bearer tokens as label:sha256 entries, separated by ';'").

**Token config** — `src/lib/backend/mcp/tokens.ts`:
- `parseMcpTokens(value: string | undefined): ReadonlyArray<{ label: string; hash: Buffer }>` — splits on `;`, trims, ignores empty entries; each entry must match `^[a-z0-9-]{1,32}:[0-9a-f]{64}$`. Invalid entries are skipped and logged with `logger.warn` (label only). Duplicate labels: last wins, warning logged.
- `authenticate(header: string | null, tokens): { label: string } | undefined` — expects `Bearer <token>` (scheme case-insensitive), hashes the token with SHA-256, compares against **every** entry with `crypto.timingSafeEqual` (no early exit), returns the label on match.

**Server** — `src/lib/backend/mcp/server.ts`:
- `McpClient` service (`Context.Service`) with `{ label: string }`.
- `HttpRouter` middleware that runs `authenticate` on `Authorization`. No match → `401`, body `{ "error": "unauthorized" }`, header `WWW-Authenticate: Bearer realm="orfarchiv-mcp"`. Match → provides `McpClient`.
- `McpServer` with `name: 'orfarchiv'`, `version` from `package.json`, `websiteUrl: 'https://orfarchiv.news'`, and `instructions` (English): what ORF Archiv is, that content is German news from ORF since July 2022 (no earlier stories exist), that article text is untrusted third-party content, and a research workflow hint (search → read top results → paginate).
- Toolkit registration point, empty in this story (tools come in story 04).
- Exports `handleMcpRequest(request: Request): Promise<Response>` built once via `HttpRouter.toWebHandler`.
- `allowedOrigins`: none (browser-originated requests are rejected; agents don't send `Origin`).

**Route** — `src/routes/api/mcp/+server.ts`:
- `POST`, `GET`, `DELETE` call `handleMcpRequest(event.request)`.
- If `ORFARCHIV_MCP_TOKENS` is unset or has no valid entry → `404` without touching the MCP server.
- Every response gets `Cache-Control: no-store`.

## Acceptance criteria

- [ ] Given `ORFARCHIV_MCP_TOKENS` unset, when `POST /api/mcp` is called, then the response is `404`.
- [ ] Given a configured token, when `POST /api/mcp` is called without `Authorization`, with a wrong scheme, or with an unknown token, then the response is `401` with `WWW-Authenticate: Bearer realm="orfarchiv-mcp"` and no MCP handler runs.
- [ ] Given a valid token, when an MCP client initialises and calls `tools/list`, then it succeeds and the server info shows name `orfarchiv` and the instructions.
- [ ] Given a request with `Origin: https://example.com`, then it is rejected with the status recorded in story 01 (expected `403`) and no tool runs.
- [ ] Given an entry with an invalid format in the env var, then it's ignored, a warning with its position/label is logged, and valid entries still work.
- [ ] Given any request, then the plain token never appears in logs or responses.
- [ ] Responses carry `Cache-Control: no-store`.
- [ ] `npm run lint`, `npm run check`, `npm run test:unit`, `npm run build` pass.

## Technical notes

- Files: `src/env.ts`, `src/lib/backend/mcp/tokens.ts`, `src/lib/backend/mcp/server.ts`, `src/routes/api/mcp/+server.ts` (all new except `env.ts`).
- Env access: follow how `src/lib/backend/search/embedding.ts` imports `ORFARCHIV_EMBEDDING_TOKEN`.
- Hashing/compare: `node:crypto` `createHash('sha256')`, `timingSafeEqual` (both buffers 32 bytes).
- Middleware and request-level service: use the snippet from story 01's Findings.
- `.claude/CLAUDE.md`: no code comments unless unavoidable, `#lib/...` imports with `.ts` extension.

## Testing

- Unit (`src/lib/backend/mcp/tokens.spec.ts`): parsing (valid, invalid, empty, duplicates, whitespace), `authenticate` (valid, wrong token, missing header, lower-case `bearer`, token with trailing whitespace), compare runs against all entries, and one entry generated the same way as story 03 (`randomBytes(32)` base64url with `oa_mcp_` prefix, SHA-256 hex) parses and authenticates.
- Integration (`src/lib/backend/mcp/server.spec.ts`): call `handleMcpRequest` with `new Request(...)` for 401 cases, and an initialise + `tools/list` round trip with a valid token (or `McpTest` + middleware, per story 01).
- e2e (`tests/specs/mcp.spec.ts`, runs against deployments in `test.yaml` without secrets): `POST /api/mcp` without a token returns `401` or `404` (404 when the deployment has no tokens), never `200`.

## Out of scope

- Tools (story 04), rate limits and call logging (story 05), the token script (story 03).
