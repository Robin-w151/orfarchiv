# 00: Dev embedding server batch size

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** –
**Estimate:** S

## User story
As the developer of this epic, I want the devcontainer's embedding server to accept article-length inputs, so that the spike (01), the dimension evaluation (03) and local runs of `embed-content` (06) can embed full article bodies.

Unblocks 01.

## Description
llama.cpp embeds an input only if it fits into one physical batch (`--ubatch-size`, default 512 tokens). Longer inputs fail with HTTP 500 (verified on 2026-10-04 with a 1,503-token input):
```
{"error":{"code":500,"message":"input (1503 tokens) is too large to process. increase the physical batch size (current batch size: 512)"}}
```
Setting `--batch-size` and `--ubatch-size` to the model's context length (`n_ctx` = 2048) allows every input the model can handle at all. This must be done manually because the devcontainer has to be rebuilt from VS Code, which Claude can't trigger.

### Runbook

#### Prerequisites
- [ ] The repository open in VS Code in the devcontainer ("ORF Archiv Dev").
- [ ] Unsaved work saved and running dev servers or long-running commands stopped, because the rebuild restarts all containers and reloads the window. Database data survives, since it lives in named volumes (`orfarchiv-db-1`, `orfarchiv-db-2`, …).

#### Steps
1. **Add the batch flags to the compose file.** In `.devcontainer/docker-compose.yml`, extend the `command:` of the `orfarchiv-embeddings` service, after `"0.0.0.0"`:
   ```yaml
         - "--batch-size"
         - "2048"
         - "--ubatch-size"
         - "2048"
   ```
   You can also ask Claude to make this edit.
   **Expected:** `git diff .devcontainer/docker-compose.yml` shows exactly these four added lines.

2. **Rebuild the devcontainer.** In VS Code: `Command Palette (Ctrl/Cmd+Shift+P) → Dev Containers: Rebuild Container`.
   **Expected:** the window reloads and the devcontainer opens again. All services are recreated with the new compose file. The model is loaded from the `orfarchiv-models` volume, so nothing is downloaded again.

3. **Note the memory usage.** On the host, run `docker stats --no-stream` (or open the container in Docker Desktop) and note the memory of the `…orfarchiv-embeddings…` container. The devcontainer itself has no `docker` CLI.
   **Expected:** a few hundred MB more than before the change. Story 07 uses the same flags on the 8 GB VPS.

#### Verify
From a terminal **inside the devcontainer**:
```sh
python3 -c "import json;print(json.dumps({'input':['wort '*1500]}))" | curl -s -X POST http://orfarchiv-embeddings:8080/v1/embeddings -H 'content-type: application/json' --data @- | head -c 120
```
**Expected:** `{"model":"ggml-org/embeddinggemma-300m-qat-q8_0-GGUF","object":"list",…`, with no `"code":500` error. `/v1/embeddings` is the OpenAI-compatible endpoint the app uses (`ORFARCHIV_EMBEDDING_URL=http://orfarchiv-embeddings:8080/v1`).

#### Rollback
Remove the four lines from `.devcontainer/docker-compose.yml` and repeat step 2.

#### Hand back to Claude
- Confirm that the verify step returns an embedding.
- The container's memory usage from step 3.
- No secrets are involved.

#### Troubleshooting
- **Verify still returns HTTP 500** → the rebuild didn't pick up the change. Check that the compose edit is saved (`git diff .devcontainer/docker-compose.yml`) and run `Dev Containers: Rebuild Container` again.
- **`orfarchiv-embeddings` is unreachable after the rebuild** → it may still be loading the model. Wait a minute and retry. If it stays down, check its log on the host (`docker logs <CONTAINER>`, or the container's Logs tab in Docker Desktop) for an error about the new flags. `<CONTAINER>` is the name `docker ps` shows for `…orfarchiv-embeddings…`.
- **The rebuild fails** → VS Code offers `Open devcontainer.json Locally` / `Edit devcontainer.json`. Revert the compose change there and rebuild, then report the error to Claude.

## Acceptance criteria
- [ ] Given the recreated container, when a 1,500-token input is posted to `/v1/embeddings`, then an embedding is returned instead of HTTP 500.
- [ ] `.devcontainer/docker-compose.yml` contains the `--batch-size 2048` / `--ubatch-size 2048` flags, so a devcontainer rebuild keeps them.

## Technical notes
- Service: `orfarchiv-embeddings` in `.devcontainer/docker-compose.yml` (image `ghcr.io/ggml-org/llama.cpp:server`, model `ggml-org/embeddinggemma-300m-qat-q8_0-GGUF`, host port 3003).
- llama.cpp server options: https://github.com/ggml-org/llama.cpp/tree/master/tools/server
- Production gets the same flags in story 07, step 10.

## Out of scope
- Production embedding servers (story 07).
- Choosing the truncation limit (story 01).
