# 03: Token generator script

**Epic:** [0005 Remote MCP server](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** –
**Size:** XS — one small Node script and one `package.json` script, no unknowns

## User story

As the owner of ORF Archiv, I want `npm run generate:mcp-token -- <label>` to print a new token and its env var entry, so that creating and rotating client tokens is one command without hand-written `openssl` pipelines.

## Description

Create `feat/mcp-server` in `ui` from `develop` if it doesn't exist yet. Add `ui/scripts/generate-mcp-token.js` (ESM, Node built-ins only, like `scripts/generate-csp-script-hashes.js`) and the script `"generate:mcp-token": "node scripts/generate-mcp-token.js"` in `ui/package.json`.

Behaviour:

- Argument: `<label>`, must match `^[a-z0-9-]{1,32}$`; otherwise print usage to stderr and exit with code 1.
- Token: `oa_mcp_` + `randomBytes(32).toString('base64url')`.
- Hash: SHA-256 hex of the token string (UTF-8, no newline).
- Output to stdout:
  ```
  Token (give to the client, store in a password manager):
  oa_mcp_…

  Entry for ORFARCHIV_MCP_TOKENS (append with ';'):
  <label>:<hash>
  ```
- Writes nothing to disk.

The format must match `parseMcpTokens` in story 02 (see "Token format" in the epic).

## Acceptance criteria

- [ ] Given `npm run generate:mcp-token -- claude-code`, then a token starting with `oa_mcp_` (50 chars total) and an entry `claude-code:<64 hex chars>` are printed, and `printf '%s' <token> | shasum -a 256` equals the hash.
- [ ] Given two runs, then the tokens differ.
- [ ] Given no label or `Claude_Code`, then usage is printed to stderr and the exit code is 1.
- [ ] `npm run lint` passes.

## Technical notes

- Files: `ui/scripts/generate-mcp-token.js` (new), `ui/package.json`.
- `node:crypto` `randomBytes`, `createHash`.

## Testing

- Manual: the commands in the acceptance criteria. A unit test isn't needed for a script this size. Format compatibility is tested in story 02 (`tokens.spec.ts`).

## Out of scope

- Storing tokens anywhere (story 06).
