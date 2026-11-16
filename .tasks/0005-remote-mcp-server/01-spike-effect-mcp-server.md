# 01: Spike: Effect MCP server on SvelteKit

**Epic:** [0005 Remote MCP server](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** –
**Size:** L — unstable Effect API, unknown client protocol support, and serverless behaviour that can only be confirmed on a real Vercel deployment

## User story

As the implementer of stories 02–05, I want a working throwaway MCP endpoint in the real stack and answers to the open protocol and hosting questions, so that the production endpoint is built on a design that is known to work with the clients we care about.

## Description

Build a minimal MCP server with one `echo` tool and a dummy bearer check on a throwaway branch `spike/mcp-server` in `ui`, then answer:

1. **SvelteKit integration.** Does `HttpRouter.toWebHandler(McpServer.layerHttpRequestScoped({ path: '/api/mcp', … }))` work when called from `src/routes/api/mcp/+server.ts` (`POST`, `GET`, `DELETE`)? Does the router `path` have to match the SvelteKit route path? Is the handler built once per module (cold start cost) and disposed correctly?
2. **Protocol support.** Which MCP protocol version do these clients negotiate, and do they work against a sessionless (`McpProtocol.v2026_07_28`) server: Claude Code (`claude mcp add --transport http …`), MCP Inspector (`npx @modelcontextprotocol/inspector`, in proxy and direct mode; direct mode sends an `Origin` header), Claude Desktop (directly or via `npx mcp-remote … --header`)?
3. **Transport decision.** If any required client can't speak `2026-07-28`: does `McpServer.layerHttp` with `v2025_11_25`/`v2025_06_18` plus `v2026_07_28` work behind SvelteKit on Vercel, and what happens when a session's request lands on a fresh instance (client error, automatic re-init)? Fallback: `@modelcontextprotocol/sdk` `StreamableHTTPServerTransport` in stateless mode. Record the decision.
4. **Auth hook.** How does an `HttpRouter.middleware` read the `Authorization` header, short-circuit with `401` + `WWW-Authenticate: Bearer`, and provide a request-level service (e.g. `McpClient` with `{ label }`) that tool handlers can `yield*`? Show a working snippet.
5. **Tool definition.** Define one tool with `Tool.make` and an Effect schema; check the generated JSON Schema in `tools/list`, how handler errors are returned (`isError` result vs JSON-RPC error), and how to test it with `effect/ai/McpTest`.
6. **Deployments.** Does it run on (a) `npm run dev`, (b) a Vercel preview of `spike/mcp-server`, (c) the Docker image (`USE_ADAPTER_NODE=true`, `ui/build-docker.sh`)? **Pushing `spike/mcp-server` to get a Vercel preview is an outward action: ask the user before pushing.**
7. **Interference.** Does the service worker (`src/service-worker/index.ts`) or the CSP/headers config affect `/api/mcp`? Does Vercel need a `vercel.json` change (function duration, headers)?

Record answers with evidence under Findings, update the epic's risks and stories 02/04/06 where the design changes. Nothing from the spike is merged; delete the branch afterwards (local and remote, with the user's OK).

## Acceptance criteria

- [ ] Every question has an answer with evidence (command output, snippet, screenshot path) under Findings.
- [ ] A transport decision (sessionless, sessions, or SDK fallback) with reasons is recorded, and stories 02 and 04 reflect it.
- [ ] The exact client setup commands/config for Claude Code, Claude Desktop and MCP Inspector are recorded for story 06.
- [ ] The status code for requests with a disallowed `Origin` header is recorded for story 02.
- [ ] A working snippet for the auth middleware providing the client label is recorded for story 02.
- [ ] No changes from the spike are merged into `develop` or `feat/mcp-server`.

## Technical notes

- Effect sources: `ui/node_modules/effect/dist/ai/McpServer.d.ts` (`layerHttpRequestScoped`, `layerHttp`, `toolkit`, `middleware`), `ai/McpProtocol.d.ts` (`v2026_07_28`, `v2025_11_25`, …), `ai/McpTest.d.ts`, `http/HttpRouter.d.ts` (`toWebHandler`, `middleware`).
- Existing route to mirror: `ui/src/routes/api/trpc/[...procedure]/+server.ts`.
- Vercel function config: `ui/vite.config.ts` (adapter selection), `ui/vercel.json`.

## Testing

- Manual and scripted checks only; results go into Findings.

## Out of scope

- Production code (stories 02–05).

## Findings

- (filled in during the spike)
