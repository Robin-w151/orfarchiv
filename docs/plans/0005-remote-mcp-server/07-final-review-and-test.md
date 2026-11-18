# 07: Final review and test

**Epic:** [0005 Remote MCP server](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** 05, 06
**Size:** M — security-relevant auth code to review, three tools, two deployments and a real research run with an agent

## User story

As the owner of this project, I want to review and test all changes of epic 0005 before it is marked done, so that nothing ships that I haven't seen working.

## Description

Final gate of the epic: review the code changes of all stories, then test the whole feature end to end against the epic goals and every story's acceptance criteria.

### Runbook

#### Prerequisites

- [ ] Stories 01–06 are Done.
- [ ] Branch `feat/mcp-server` in the `ui` submodule, deployed as a Vercel preview with `ORFARCHIV_MCP_TOKENS` set (story 06).
- [ ] Node 24, npm 11.
- [ ] Tokens from story 06 in your password manager; Claude Code with `orfarchiv` registered.
- [ ] MCP Inspector: `npx @modelcontextprotocol/inspector` (setup per story 01's Findings).

#### 1. Review the changes

```sh
cd ui
git fetch && git diff develop...feat/mcp-server --stat
```

| Story | Main files changed | Look closely at |
| --- | --- | --- |
| 02 Endpoint and auth | `src/env.ts`, `src/lib/backend/mcp/tokens.ts`, `src/lib/backend/mcp/server.ts`, `src/routes/api/mcp/+server.ts` | Constant-time compare over all entries; 401 before any MCP handling; 404 when unset; no token in logs; `Cache-Control: no-store`; `Origin` handling |
| 03 Token script | `scripts/generate-mcp-token.js`, `package.json` | Uses `randomBytes(32)`; hash of the exact token string |
| 04 Tools | `src/lib/backend/mcp/tools.ts` | `isOrfUrl` enforced; no `contentHtml` in output; cursor decoding validated; date/time zone conversion |
| 05 Limits and logging | `src/lib/backend/mcp/*`, `src/lib/configs/server.ts` | Limit applied before backend calls; log lines contain no tokens or article text |
| Tests | `src/lib/backend/mcp/*.spec.ts`, `tests/specs/mcp.spec.ts` | Auth failure cases covered |

#### 2. Set up a test environment

1. **Install and start locally.**
   ```sh
   cd ui
   git checkout feat/mcp-server
   npm ci
   npm run dev
   ```
   **Expected:** app on http://localhost:3001; `ui/.env.local` contains `ORFARCHIV_MCP_TOKENS=preview:<HASH>` (story 06) and the DB/embedding vars you normally use.

#### 3. Run automated checks

```sh
npm run lint
npm run check
npm run test:unit
npm run build
TEST_BASE_URL=https://<PREVIEW_URL> npm run test:e2e
```

**Expected:** all green, no new warnings.

#### 4. Manual test cases

`<URL>` = http://localhost:3001 or the preview URL; `<TOKEN>` = the `preview` token.

| # | Covers | Steps | Expected | Result |
| --- | --- | --- | --- | --- |
| T1 | Goal 2, 02 AC2 | `curl -i -X POST <URL>/api/mcp` without / with `Bearer wrong` | `401`, `WWW-Authenticate: Bearer realm="orfarchiv-mcp"` | |
| T2 | 02 AC1 | Remove `ORFARCHIV_MCP_TOKENS` from `.env.local`, restart, `curl -i -X POST <URL>/api/mcp` | `404`; restore afterwards | |
| T3 | Goal 1, 02 AC3, 04 AC1 | MCP Inspector → Streamable HTTP (connection type: via proxy), `<URL>/api/mcp`, header `Authorization: Bearer <TOKEN>` → Connect → List tools | Server `orfarchiv` with instructions; tools `search_news`, `get_story_content`, `list_sources` | |
| T4 | 04 AC2 | Inspector: `search_news { "query": "nationalratswahl", "from": "2024-09-01", "to": "2024-10-31" }` | Stories from that range only, compact shape | |
| T5 | 04 AC3 | Call again with returned `nextCursor`; then with a modified cursor | Next page; "Invalid cursor" | |
| T6 | 04 AC4 | `search_news { "matchMode": "semantic", "query": "Hochwasser in Niederösterreich" }`; then without `query` | Relevant stories; error without query | |
| T7 | 04 AC6, AC7 | `get_story_content` with a URL from T4, then with `maxChars: 1000` | Title matches the story from T4; plain-text chapters; `truncated: true` | |
| T8 | 04 AC8 | `get_story_content { "url": "https://example.com" }` | Error result, nothing fetched | |
| T9 | 05 | Set `ORFARCHIV_MCP_RATE_LIMIT=3` locally, restart, call `list_sources` 4×; wait for the window, then `search_news` semantic 2× | 4th `list_sources` call and 2nd semantic call return the rate-limit error (semantic costs 3); logs show one `mcp-tool-call` line per call with label, no token | |
| T10 | Goal 5, end to end | After merge, in Claude Code with the `orfarchiv` server registered in story 06 (develop URL), ask: "Use the orfarchiv tools: how did ORF report on the Nationalratswahl 2024 between September and November? Cite article URLs." | Agent uses `search_news` and `get_story_content`, answer cites ORF URLs | |
| T11 | Regression | Use the app on the preview: search, semantic search, open a story, bookmarks, settings | Works as on `develop`; `/api/trpc` unaffected | |
| T12 | Deployment | After merge: repeat T1 and T3 against https://develop.orfarchiv.news/api/mcp | Same results | |
| T13 | 03 | `npm run generate:mcp-token -- test-label`; then with `Test_Label` | 50-char `oa_mcp_` token, entry hash equals `printf '%s' <token> \| shasum -a 256`; invalid label exits 1 with usage | |
| T14 | 02 AC4, AC7 | `curl -i -X POST <URL>/api/mcp -H "Authorization: Bearer <TOKEN>" -H "Origin: https://example.com"` | Rejected (status per story 01); every response has `Cache-Control: no-store` | |
| T15 | 02 AC5 | Locally append `;broken-entry` to `ORFARCHIV_MCP_TOKENS`, restart, call `tools/list` | Works; one warning in the log naming the entry, no token | |
| T16 | 04 AC5, AC9 | `search_news { "sources": ["unknown"] }`; `get_story_content` with an ORF URL without content | Validation error naming `sources`; "No content found for <url>" | |
| T17 | 05 AC2, AC3 | With `ORFARCHIV_MCP_RATE_LIMIT=10` and two local tokens: `get_story_content` 3× with token A, then 1× with token B | 3rd call of A rate-limited; B succeeds | |

#### 5. Outcome

- **Pass:** open PR `feat/mcp-server` → `develop` in `ui`, wait for CI, merge; semantic-release publishes `5.0.0-next.N`. Run T12 and T10. Bump the `ui` submodule in the root repo (`chore: bump submodules`). Set this story and the epic's Status to Done. Production (`orfarchiv.news`) gets the endpoint with the next regular release to `main`.
- **Fail:** write each problem under Findings below (test #, what happened, expected). Hand back to Claude, who turns findings into fix stories before this checkpoint (or a follow-up epic); then repeat this story.

#### Troubleshooting

- **Inspector can't connect but curl works** → protocol version mismatch; check story 01's Findings for the Inspector transport settings.
- **401 on the preview with the right token** → the preview wasn't redeployed after setting the env var (story 06, step 9).
- **Semantic search errors** → `ORFARCHIV_EMBEDDING_URL` not set locally, or the embedding rate limit is hit.

## Findings

- (filled in by the user during review and testing)

## Acceptance criteria

- [ ] Code changes of all stories reviewed; no open concerns (or concerns recorded as findings).
- [ ] Automated checks pass.
- [ ] Every manual test case passes, covering every epic goal and every story's acceptance criteria.
- [ ] User signs off; epic Status set to Done.

## Out of scope

- Fixing problems found here — they become new stories.
