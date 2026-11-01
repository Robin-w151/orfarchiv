# 01: Create relay repository

**Epic:** [0004 Bookmark device sync](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** –
**Size:** S — a handful of GitHub web UI steps and one submodule command; low risk

## User story

As the maintainer, I want an empty `orfarchiv-relay` repository registered as a submodule, with the release secrets in place, so that the relay service (story 03) has a home whose CI can release and publish images like the scraper's.

## Description

Creating a GitHub repository and setting its package permissions has to happen in the GitHub web UI under the maintainer's account. Claude fills the repo with code in story 03.

### Runbook

#### Prerequisites

- [ ] Signed in to GitHub as `Robin-w151`
- [ ] Local clone of the superproject at `/workspaces/orfarchiv` on `main`, clean working tree
- [ ] SSH access to GitHub (the other submodules use `git@github.com:` URLs)

#### Steps

1. **Create the repository**
   GitHub → `+` (top right) → `New repository`.
   - Owner: `Robin-w151`
   - Repository name: `orfarchiv-relay`
   - Description: `Stateless WebSocket relay for ORF Archiv bookmark sync`
   - Visibility: **Public** (same as the other submodules)
   - Initialize with README: **checked**. The submodule needs an initial commit.
   - License: `MIT License`

   **Expected:** the repository page `https://github.com/Robin-w151/orfarchiv-relay` shows `README.md` and `LICENSE` on `main`.

2. **Create the release secrets**
   The scraper's release job ([scraper/.github/workflows/ci.yaml](../../scraper/.github/workflows/ci.yaml)) signs its release commits with an SSH key and sets the git author from secrets. The relay workflow (story 03) uses the same four secrets. GitHub never shows a secret's value again after it is saved, so take the values from where you keep them (password manager, or `~/.ssh` for the signing key), not from the scraper repo.
   `orfarchiv-relay` → `Settings → Secrets and variables → Actions → New repository secret`, once for each:
   - `SSH_SIGNING_KEY`: the private key that signs release commits (the full content of the key file, including the `-----BEGIN …-----` lines).
   - `SSH_SIGNING_KEY_PUBLIC`: the matching public key (one line, `ssh-ed25519 …`).
   - `GIT_NAME`: the author name on release commits, the same as in the scraper repo.
   - `GIT_EMAIL`: the author e-mail on release commits, the same as in the scraper repo.

   `GITHUB_TOKEN` is provided by GitHub automatically. The workflow asks for `contents: write` and `packages: write` per job, so the repository's default workflow permissions can stay at "Read".
   **Expected:** `Settings → Secrets and variables → Actions` lists exactly those four secrets.
   Docs: https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions

3. **Make the signing key known to GitHub**
   Check `https://github.com/settings/keys` → "Signing keys". The public key from step 2 should already be there, because scraper releases use it. If it isn't, add it there with `New SSH key` → Key type **Signing Key**.
   **Expected:** the key is listed under "Signing keys". Release commits then show as "Verified".

4. **Add the submodule to the superproject**

   ```sh
   cd /workspaces/orfarchiv
   git submodule add git@github.com:Robin-w151/orfarchiv-relay relay
   git submodule update --init relay
   ```

   **Expected:** `.gitmodules` has a new `[submodule "relay"]` entry, and `relay/README.md` exists.

5. **Commit the submodule registration**
   ```sh
   git add .gitmodules relay
   git commit -m "chore: add relay submodule"
   git push
   ```
   **Expected:** the superproject on GitHub shows `relay @ <sha>`.

#### Verify

```sh
cd /workspaces/orfarchiv
git submodule status relay
git -C relay remote -v
```

**Expected:** a commit SHA for `relay`, and `origin git@github.com:Robin-w151/orfarchiv-relay (fetch/push)`.

#### Rollback

```sh
git submodule deinit -f relay
git rm -f relay
rm -rf .git/modules/relay
git commit -m "chore: remove relay submodule"
```

Then delete the repository: `Settings → General → Danger Zone → Delete this repository`.

#### Hand back to Claude

- Confirmation that `relay/` exists and is on `main`.
- Confirmation that the four secrets from step 2 exist. Never the values.

#### Troubleshooting

- **`fatal: You are on a branch yet to be born`** when adding the submodule → the repo was created without a README. Add any file in the web UI and retry step 4.
- **`Permission denied (publickey)`** → your SSH key isn't loaded in the devcontainer. Run `ssh -T git@github.com` to check.

## Acceptance criteria

- [ ] Given the superproject, when running `git submodule status`, then `relay` is listed next to `db`, `scraper`, `shared` and `ui`.
- [ ] Given the `orfarchiv-relay` repo, when viewing `Settings → Secrets and variables → Actions`, then `SSH_SIGNING_KEY`, `SSH_SIGNING_KEY_PUBLIC`, `GIT_NAME` and `GIT_EMAIL` are listed.

## Technical notes

- Mirrors the existing submodule setup in [.gitmodules](../../.gitmodules).
- Story 03 adds `orfarchiv-shared` as a nested submodule at `relay/src/shared/common`, as in `scraper/.gitmodules`.

## Out of scope

- Any code, Dockerfile or CI workflow (story 03).
- DNS, VPS deployment (story 04).
