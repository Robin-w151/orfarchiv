# 06: Create tokens and configure clients

**Epic:** [0005 Remote MCP server](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** 03, 04
**Size:** S — a few commands, two Vercel env var entries and client setup; needs your Vercel access and password manager

## User story

As the owner of ORF Archiv, I want tokens for my clients created, stored safely and configured in Vercel and Claude Code, so that the endpoint from stories 02–05 can be used and tested.

## Description

Tokens are secrets, and setting Vercel env vars needs your account, so this is manual. You create one token per client (so each can be revoked alone) plus one for Vercel previews and local development.

### Runbook

#### Prerequisites

- [ ] Story 03 is on `feat/mcp-server` (the `generate:mcp-token` script exists).
- [ ] `feat/mcp-server` with stories 02–04 is pushed and has a Vercel preview (ask Claude to commit and push it).
- [ ] Access to the Vercel project of `ui` (Settings → Environment Variables).
- [ ] A password manager (e.g. 1Password) to store the plain tokens.
- [ ] Claude Code installed (`claude --version`).
- [ ] Story 01's Findings on Claude Desktop / MCP Inspector setup at hand.

#### Steps

1. **Generate the tokens.**
   ```sh
   cd ui
   git checkout feat/mcp-server
   npm run generate:mcp-token -- claude-code
   npm run generate:mcp-token -- claude-desktop
   npm run generate:mcp-token -- preview
   ```
   **Expected:** for each, a token `oa_mcp_…` and an entry `<label>:<64 hex>`. Skip `claude-desktop` if you don't use it.
2. **Store each token** in your password manager as "ORF Archiv MCP - <label>" (plain hyphen, so the `op://` path is easy to type). Keep the entries (`label:hash`) in a scratch note for the next steps; they aren't secret.
3. **Set the production value.** Vercel → project `ui` → Settings → Environment Variables → Add:
   - Key: `ORFARCHIV_MCP_TOKENS`
   - Value: `claude-code:<HASH>;claude-desktop:<HASH>`
   - Environment: Production
   **Expected:** variable listed for Production.
4. **Set the preview value.** Add again:
   - Key: `ORFARCHIV_MCP_TOKENS`
   - Value: `claude-code:<HASH>;preview:<HASH>`
   - Environment: Preview (this includes `develop.orfarchiv.news`, `TODO: confirm`)
5. **Local development.** Append to `ui/.env.local` (git-ignored; create it if missing):
   ```sh
   ORFARCHIV_MCP_TOKENS=preview:<HASH>
   ```
6. **Make the token available to Claude Code without a tracked file.** In `~/.zshrc`, add an alias so 1Password is only asked when Claude Code starts, not in every shell:
   ```sh
   alias claude='ORFARCHIV_MCP_TOKEN="$(op read "op://Private/ORF Archiv MCP - claude-code/password")" command claude'
   ```
   For step 7, export it once in the current shell: `export ORFARCHIV_MCP_TOKEN="$(op read 'op://Private/ORF Archiv MCP - claude-code/password')"`. Without 1Password CLI, paste the token instead. Open a new shell.
7. **Register the server in Claude Code** (user scope, not a project file):
   ```sh
   claude mcp add --scope user --transport http orfarchiv https://develop.orfarchiv.news/api/mcp \
     --header "Authorization: Bearer ${ORFARCHIV_MCP_TOKEN}"
   ```
   Note: this writes the expanded token into `~/.claude.json`. Alternative that keeps only the variable reference: a `.mcp.json` with `"headers": { "Authorization": "Bearer ${ORFARCHIV_MCP_TOKEN}" }`.
   **Expected:** `claude mcp list` shows `orfarchiv`. It shows "failed" until the epic is merged and deployed to `develop`; that's fine for now.
   Switch the URL to `https://orfarchiv.news/api/mcp` after the next production release (`claude mcp remove orfarchiv --scope user`, then add again with the production URL).
8. **Claude Desktop (optional).** Follow story 01's Findings (expected: `mcp-remote` bridge in `claude_desktop_config.json` with the header, token from env). `TODO: confirm` exact config after story 01.
9. **Trigger a redeploy** of the latest preview of `feat/mcp-server` (Vercel → Deployments → … → Redeploy) so it picks up the Preview variable.

#### Verify

```sh
# without token: expect 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<PREVIEW_URL>/api/mcp
# with token: expect 200 and a JSON-RPC result
curl -s -X POST https://<PREVIEW_URL>/api/mcp \
  -H "Authorization: Bearer <PREVIEW_TOKEN>" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: <VERSION FROM STORY 01>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

- `<PREVIEW_URL>`: the Vercel preview hostname of `feat/mcp-server`.
- `<PREVIEW_TOKEN>`: the `preview` token from your password manager.

**Expected:** `401`, then a JSON body listing the tools (once story 04 is deployed). Request details may change per story 01; use its Findings.

#### Rollback

Delete or edit `ORFARCHIV_MCP_TOKENS` in Vercel and redeploy; without it the endpoint answers `404`. Remove the client with `claude mcp remove orfarchiv --scope user`.

#### Hand back to Claude

- Confirm `ORFARCHIV_MCP_TOKENS` is set for Production and Preview, and which labels exist (labels only, never tokens or hashes in chat).
- The preview URL used for the check.

#### Troubleshooting

- **401 with the right token** → hash mismatch: the entry was copied with a trailing space or newline, or the deployment wasn't redeployed after setting the variable.
- **404** → `ORFARCHIV_MCP_TOKENS` isn't set for that environment or all entries are invalid; check the function logs for the warning from story 02.
- **`claude mcp list` shows failed** → the server isn't deployed to that URL yet, or `ORFARCHIV_MCP_TOKEN` was empty when you ran `claude mcp add` (check `~/.claude.json`).

## Acceptance criteria

- [ ] Given Vercel, then `ORFARCHIV_MCP_TOKENS` exists for Production and Preview with valid entries.
- [ ] Given the password manager, then each plain token is stored there and nowhere in the repo.
- [ ] Given `claude mcp list`, then `orfarchiv` is registered.

## Technical notes

- Token format: see "Token format" in the epic README.
- Vercel env var docs: https://vercel.com/docs/environment-variables
- Claude Code MCP docs: https://code.claude.com/docs/en/mcp

## Out of scope

- Testing the tools end to end (story 07).
