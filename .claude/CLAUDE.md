# Instructions

## Git

- Never commit on your own — only commit when explicitly asked.
- Use the conventional commit message format. Allowed types: `chore`, `ci`, `fix`, `feat`, `test`.
- Do not add a commit message body
- Use the github cli `gh` when possible
- When creating new branches note that there exist submodules: `db`, `scraper` and `ui`.
  Create branches within the right submodules instead of the root git project when working on their code.

## Tooling

- Prefer the scripts provided by `package.json` (linting, testing, building, etc.) over invoking tools directly.

## Docs

- Only add docs if explicitly asked for
- Do not add code comments by default, only if explicitly asks for or if it is absolutely necessary because the code is really really really weird
