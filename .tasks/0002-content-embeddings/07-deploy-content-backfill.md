# 07: Deploy and run content backfill

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Human
**Status:** In Progress
**Depends on:** 06
**Estimate:** M (hands-on), plus several days of unattended backfill

## User story

As the operator, I want the new schema applied on production and the `embed-content` job running on the VPS, so that the archive gets content embeddings while M0 stays untouched.

## Description

This must be done manually because it changes production systems (VPS compose stack, live MongoDB index, released images) that Claude can't reach.

### Runbook

#### Prerequisites

- [x] Stories 04, 05 and 06 are merged, and `db` and `scraper` releases are published to ghcr (`ghcr.io/robin-w151/orfarchiv-db`, `ghcr.io/robin-w151/orfarchiv-scraper`). Note both versions.
- [x] SSH to the VPS (`<vps>` = your SSH host alias) and the compose directory (`<compose-dir>`) from epic 0001.
- [x] The M0 label `<cluster>.mongodb.net` and the VPS label `db1.orfarchiv.news:27017` at hand.
- [x] The existing embedding server on the VPS: its compose service name (`<EMBEDDINGS_SERVICE>`), its model volume, and the URL `scraper` uses (`ORFARCHIV_EMBEDDING_URL`).
- [x] The truncation limit: `1024` tokens (`CONTENT_MAX_TOKENS`, decided after story 01).
- [x] The core split between the two embedding servers: 2 cores each (`cpuset` `"0-1"` / `"2-3"`, `--threads 2`), calibrated on 2026-10-14. Step 12 checks it.
- [x] The API token of the main embedding server (`ORFARCHIV_EMBEDDING_TOKEN` of `scraper`) and its port on the host, for the latency measurement in step 12.
- [x] The fetch rate: `10` per `1 second` (confirmed).
- [x] The User-Agent: story 06 made `orfarchiv-scraper/<version> (+https://orfarchiv.news)` the default, so `ORFARCHIV_CONTENT_USER_AGENT` only needs to be set to override it.
- [x] `ORFARCHIV_DB_RW_URL` for the count query in Verify and the full revert in Rollback, as defined in epic 0001 story 08 (read the password with `read -rs`).
- [x] A `tmux` session on the VPS.

#### Steps

1. **Release the images.** On GitHub in the browser, one repository after the other, in this order: `shared` (merge only; it has no image), then `db`, then `scraper`.
   - Repositories: https://github.com/Robin-w151/orfarchiv-shared, https://github.com/Robin-w151/orfarchiv-db, https://github.com/Robin-w151/orfarchiv-scraper
   1. `Pull requests → New pull request`, base `main`, compare `<BRANCH>`, title `feat: content embeddings`, then `Create pull request`.
   2. In `db` and `scraper`, check under `Files changed` that the `src/shared/common` submodule points at a commit that is already on `orfarchiv-shared`'s `main` (merged in the first round). If `shared` was squash- or rebase-merged, the branch commit isn't on `main`: ask Claude to bump the submodule to the merged commit on the `db` / `scraper` branch first.
   3. Wait until the checks are green, then `Merge pull request`.
   4. `Actions` → the run on `main`: wait until the release and image jobs are green. `Releases` (right sidebar on the repository page) shows the new version; note it.
   - `<BRANCH>`: the feature branch of this epic in that repository.
     **Expected:** a new release for `db` and `scraper`, and both images on ghcr (`ghcr.io/robin-w151/orfarchiv-db`, `ghcr.io/robin-w151/orfarchiv-scraper`) with that version.

2. **Back up the compose file.**

   ```bash
   ssh <vps>
   cd <compose-dir>
   cp docker-compose.yml docker-compose.yml.pre-0002
   ```

   **Expected:** the backup file exists.

3. **Set the opt-out on every service.** In `docker-compose.yml`, add this to the `environment:` of `scraper`, `db-backup` and `db-verify`:

   ```yaml
   ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS: "<M0_LABEL>"
   ```

   - `<M0_LABEL>`: the M0 authority, for example `<cluster>.mongodb.net`.
     Then pin the new `db` and `scraper` image versions from step 1.
     **Expected:** `docker compose config -q` prints nothing.

4. **Pull and check the targets.**

   ```bash
   docker compose pull scraper db-backup db-verify
   docker compose run --rm db-backup targets
   docker compose run --rm scraper targets
   ```

   **Expected:** both list the VPS as `1. db1.orfarchiv.news:27017 (content)` and M0 as `2. <M0_LABEL> (no content)`, and there's no warning about an unknown excluded label.

5. **Pause verification.** The running `db-verify` still has the old image and model. During and after the rebuild it would report the VPS index as changed or not queryable and alert on every run.

   ```bash
   docker compose stop db-verify
   docker compose ps db-verify
   ```

   **Expected:** the service is shown as `exited`.

6. **Recreate the search index (VPS only, planned outage).** Pick a low-traffic time. Semantic search fails until the rebuild is done (story 01 measured the duration), while keyword search keeps working.

   ```bash
   docker compose run --rm db-backup setup --target db1.orfarchiv.news:27017 --recreate-search-indexes --wait-until-queryable
   ```

   **Expected:** the log says `news_title_vector` is recreated, prints its status on every check (backing off from 1 s to at most every 30 s), and the command exits 0 once the index is `READY` and queryable. If it times out (default 30 minutes), the index keeps building. Continue with step 8 to check it.

7. **Check M0 is unchanged.**

   ```bash
   docker compose run --rm db-backup setup --target <M0_LABEL>
   ```

   **Expected:** `Search index 'news_title_vector' is up to date.`

8. **Check the index.** Confirm independently of `setup` that the VPS index has the expected definition and is queryable. `db verify` checks both for every expected search index; with `--target` it checks only that target.

   ```bash
   docker compose run --rm db-verify verify --target db1.orfarchiv.news:27017; echo "exit=$?"
   ```

   **Expected:** `Target is healthy.` and `exit=0`. A `search index 'news_title_vector' not queryable (status BUILDING)` problem means the rebuild is still running: wait and repeat.

9. **Restart the long-running services with the new images.** Until now only `docker compose run` used the new images; the running services still have the old images and environment.

   ```bash
   docker compose up -d scraper db-backup db-verify
   docker compose ps scraper db-backup db-verify
   docker compose run --rm db-verify verify; echo "exit=$?"
   ```

   **Expected:** all three are `Up`, and verify prints `exit=0` (VPS with both vector paths, M0 title-only, no content on M0).

10. **Add a pinned embedding instance for the content job.** Search queries keep the existing embedding server to themselves. Both servers get their own cores via `cpuset`. A `cpus:` quota isn't enough: llama.cpp defaults to one thread per core and synchronizes its threads on every step, so a main server that shares even one core with the content instance waits for its slowest thread on every request (measured on 2026-10-14: query p95 0.096 s idle, 1.58 s with `cpus: 1.5` on the content instance and the main server unpinned).

    First pin `<EMBEDDINGS_SERVICE>` to the other cores and match its threads:

```yaml
<EMBEDDINGS_SERVICE>:
  command: [..., "--threads", "<MAIN_THREADS>"]
  cpuset: "<MAIN_CORES>"
```

Then add this service to `docker-compose.yml` by copying `<EMBEDDINGS_SERVICE>`'s image, model arguments, network and model volume, without publishing a port:

```yaml
embeddings-content:
  image: ghcr.io/ggml-org/llama.cpp:server
  command:
    [
      "-hf",
      "ggml-org/embeddinggemma-300m-qat-q8_0-GGUF",
      "--embeddings",
      "--host",
      "0.0.0.0",
      "--threads",
      "<CONTENT_THREADS>",
      "--batch-size",
      "<UBATCH>",
      "--ubatch-size",
      "<UBATCH>",
    ]
  cpuset: "<CONTENT_CORES>"
  volumes:
    - <MODELS_VOLUME>:/root/.cache/llama.cpp
  restart: unless-stopped
```

- `<MAIN_CORES>` / `<MAIN_THREADS>`: `"0-1"` / `2`. `<CONTENT_CORES>` / `<CONTENT_THREADS>`: `"2-3"` / `2`. The threads always match the number of pinned cores, and the two core sets never overlap. mongod, mongot and the scraper containers stay unpinned. Step 12 checks the split.
- `<UBATCH>`: `2048`, as in the devcontainer (story 00). Without it, inputs over 512 tokens fail with HTTP 500. Don't lower it to save CPU: one story is sent per request, so it doesn't change the work per input, only the compute buffer's memory. It must stay above `1024`, because `/tokenize` doesn't count the BOS/EOS tokens the server adds.
- `<MODELS_VOLUME>`: the model cache volume of `<EMBEDDINGS_SERVICE>`, so the model isn't downloaded twice.

```bash
docker compose up -d <EMBEDDINGS_SERVICE> embeddings-content
docker compose logs --since 2m <EMBEDDINGS_SERVICE> embeddings-content | grep -i -e n_threads -e listening
```

**Expected:** both logs show `n_threads = 2` and the server listening on port 8080, and `docker stats --no-stream embeddings-content` shows memory of about 400 MiB idle and, under load, CPU of at most 200 %. For reference, on 2026-10-11 the dev instance with the 2048 flags used ≈ 405 MiB (story 00), and the existing VPS instance `orfarchiv-embedding-1` with the default batch size used ≈ 157 MiB of 7.6 GiB.

11. **Add the content job container.** Add a service to `docker-compose.yml` by copying `scraper`'s `image`, `environment`, secrets and `user`, and change:

```yaml
scraper-content:
  image: ghcr.io/robin-w151/orfarchiv-scraper:<SCRAPER_VERSION>
  command: ["embed-content", "--poll"]
  environment:
    # everything scraper has, plus:
    ORFARCHIV_EMBEDDING_URL: "http://embeddings-content:8080/v1"
    ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS: "<M0_LABEL>"
    ORFARCHIV_CONTENT_FETCH_RATE_LIMIT: "10"
    ORFARCHIV_CONTENT_FETCH_RATE_WINDOW: "1 second"
    ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT: "<CONTENT_EMBED_LIMIT>"
    ORFARCHIV_CONTENT_EMBEDDING_RATE_WINDOW: "1 minute"
  restart: unless-stopped
```

- `<CONTENT_EMBED_LIMIT>`: start high (for example `120`), so the cores of `embeddings-content` are what limits throughput (≈ 21 docs/min on 2 cores, so `120` never limits).
- `ORFARCHIV_EMBEDDING_URL` points at the pinned instance from step 10 and overrides the value copied from `scraper`. It **must end in `/v1`**: embeddings go to `<url>/embeddings`, and without `/v1` llama.cpp answers in its own format instead of the OpenAI one, so every story fails as `Embedding response was malformed`. The scraper calls `/tokenize` and `/health` at the server root (the URL without `/v1`), so `scraper-content` must reach the instance directly, not through a proxy that only forwards `/v1/*`.
- Rate limits and windows are validated at startup: a value that isn't a positive integer or a duration (for example `ten` or `1 sec`) stops the container with `…_RATE_LIMIT must be a positive integer …`. An empty value means the default.
  **Expected:** `docker compose config -q` is silent.

**Check the endpoints the content job uses.** This runs inside `scraper-content` (same network, environment and secrets), derives the URLs exactly as the scraper does, and calls all three endpoints. The embedding request uses an input of about 1000 tokens, the most the scraper sends:

```bash
docker compose run --rm --no-deps --entrypoint node scraper-content --input-type=module -e '
import fs from "node:fs";
const env = (name) => (process.env[`${name}_FILE`] ? fs.readFileSync(process.env[`${name}_FILE`], "utf8").trim() : (process.env[name] ?? ""));
const api = env("ORFARCHIV_EMBEDDING_URL").replace(/\/$/, "");
const root = api.replace(/\/v1$/, "");
const token = env("ORFARCHIV_EMBEDDING_TOKEN");
const headers = { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) };
const long = `title: Test | text: ${"Österreich ".repeat(1000)}`;
const checks = [
  ["GET", `${root}/health`, undefined, (json) => json.status === "ok"],
  ["POST", `${root}/tokenize`, { content: "title: Test | text: Österreich", with_pieces: true }, (json) => json.tokens?.[0]?.piece !== undefined],
  ["POST", `${api}/embeddings`, { input: [long] }, (json) => json.data?.[0]?.embedding?.length >= 512],
];
let failed = 0;
for (const [method, url, body, valid] of checks) {
  try {
    const response = await fetch(url, { method, headers, body: body && JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
    const text = await response.text();
    const ok = response.ok && valid(JSON.parse(text));
    failed += ok ? 0 : 1;
    console.log(`${ok ? "OK  " : "FAIL"} ${method} ${url} -> ${response.status}${ok ? "" : ` ${text.slice(0, 150)}`}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${method} ${url} -> ${error.cause?.code ?? error.message}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
'; echo "exit=$?"
```

**Expected:**

```text
OK   GET http://embeddings-content:8080/health -> 200
OK   POST http://embeddings-content:8080/tokenize -> 200
OK   POST http://embeddings-content:8080/v1/embeddings -> 200
exit=0
```

Any `FAIL` line: see "Endpoint check fails" under Troubleshooting. Don't continue to step 12 until all three are `OK`.

12. **Limited run and check the core split.** The run writes real embeddings to the VPS, which is harmless because the backfill would write the same ones. First measure query latency on the main embedding server as a baseline, with no content job running, then start a limited run and measure again while it's busy:

    ```bash
    read -rs TOKEN
    latency() { for i in $(seq 20); do curl -s -o /dev/null -w '%{http_code} %{time_total}\n' -X POST <MAIN_EMBEDDING_URL>/embeddings -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" -d '{"input":["task: search result | query: Teuerung"]}'; done | sort -k2 -n; }
    latency
    docker compose run --rm scraper-content embed-content --max-docs 100
    # in a second tmux pane (define TOKEN and latency there as well), while the run is busy:
    latency
    ```

    - `<MAIN_EMBEDDING_URL>`: the main embedding server as reachable from the VPS shell, through its published port and including `/v1` if the server sits behind a proxy (for example `http://localhost:<port>`). The `ORFARCHIV_EMBEDDING_URL` of `scraper` usually uses a compose-internal hostname that doesn't resolve on the host.
    - `TOKEN`: the main server's API token (`ORFARCHIV_EMBEDDING_TOKEN`). Leave it empty if the server has none.
      **Expected:** every latency line starts with `200`; times of about 1 ms mean the request failed (for example `401` without the token). The run shows about 100 processed, mostly `embedded`, a few `failed` at most, no `failed` target, and no `Embedding server is unavailable, ending batch early` or `Failed to embed content of story` lines (if there are, repeat the endpoint check from step 11). The 19th of the 20 latencies (p95) is below 1 s during the run, and the run processes ≥ 20 docs/min (100 divided by the `embed-content=<n>ms` duration of the last log line; the fetch rate allows up to 600, so the embedding instance's cores are the limit).
      **Measured on 2026-10-14** (4 vCPU VPS):

      | Split (main / content) | Query p95 idle | Query p95 during the run | Docs/min |
      | ---------------------- | -------------- | ------------------------ | -------- |
      | unpinned / `cpus: 1.5` | 0.096 s        | 1.58 s                   | 11.0     |
      | 3 / 1 cores            | 0.096 s        | 0.110 s                  | 11.4     |
      | 2 / 2 cores            | 0.096 s        | 0.126 s                  | 21.5     |

      2 / 2 is the chosen split: ≈ 14 days for the 443k stories. 1 / 3 would reach ≈ 30 docs/min, but search queries and the `scrape` title embeddings would then share one thread, and concurrent requests would queue (the sequential latency loop can't show that).
      If latency is too high, move a core from the content instance to the main server; if throughput is too low, move one the other way. Update both `cpuset` and `--threads`, run `docker compose up -d <EMBEDDINGS_SERVICE> embeddings-content`, and repeat. The scraper's own `--batch-size` (stories per batch, default `20`) doesn't help: stories are embedded one after another, and the overhead between batches is ≈ 0.1 s. Note the final values for the handoff.

13. **Start the job.**

    ```bash
    docker compose up -d scraper-content
    docker compose logs -f --since 5m scraper-content
    ```

    **Expected:** batches logged back to back, a backlog count that goes down, and `scraper` ticks unaffected (`persist=<n>ms` similar to before).

14. **Monitor daily until done.**
    ```bash
    docker compose run --rm db-verify verify
    docker stats --no-stream
    ```
    **Expected:** the VPS's missing-content count falls each day, M0 reports no content problems, and mongot or embedding container memory stays within the VPS's 8 GB.

#### Verify

```bash
docker compose run --rm db-verify verify; echo "exit=$?"
npx mongosh "$ORFARCHIV_DB_RW_URL" --quiet --eval '
  const n = db.getSiblingDB("orfarchiv").news;
  printjson({
    total: n.countDocuments({}),
    embedded: n.countDocuments({ contentStatus: "embedded" }),
    failed: n.countDocuments({ contentStatus: "failed" }),
  })'
```

**Expected:** `exit=0`, and once the backfill is complete, `embedded + failed ≈ total`, with `failed` below 10% unless story 01 predicted otherwise.

#### Rollback

- **Content job causes load or problems:** `docker compose stop scraper-content embeddings-content`. Nothing else depends on them.
- **Index rebuild causes trouble:** restore the previous `db` image version in the compose file, then run `docker compose run --rm db-backup setup --target db1.orfarchiv.news:27017 --recreate-search-indexes` to recreate the title-only definition (another outage of the same length). The content fields stay in the documents but are ignored. The previous `db` image doesn't know `--wait-until-queryable`, so check with step 8's command instead; with the old image it checks the title-only definition.
- **Full revert:** `cp docker-compose.yml.pre-0002 docker-compose.yml && docker compose up -d`, then recreate the title-only index as in "Index rebuild causes trouble" (another outage); otherwise the old `verify` reports the two-path index as drift. To remove the data as well:
  ```bash
  npx mongosh "$ORFARCHIV_DB_RW_URL" --eval 'db.getSiblingDB("orfarchiv").news.updateMany({}, { $unset: { contentEmbedding: "", contentStatus: "" } })'
  ```

#### Hand back to Claude

- The released `db` and `scraper` versions.
- The final `cpuset` and `--threads` of both embedding servers, the scraper's `--batch-size` and `ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT`, plus the measured docs/min and query p95 (idle and during the run).
- The daily backlog numbers (for story 09's timing decision).
- Anything odd in the logs: many `failed` with reason `empty` from one source, 429 or 403 from orf.at.
- No secrets are needed.

#### Troubleshooting

- **Endpoint check fails (step 11)**:
  - `FAIL GET …/health -> ENOTFOUND` or `ECONNREFUSED` → `embeddings-content` isn't running or isn't on the same network as `scraper-content`. Check `docker compose ps embeddings-content` and the `networks:` of both services.
  - `FAIL GET …/health -> 503` → the model is still loading. Wait a minute and repeat.
  - `/health` and `/tokenize` are `OK`, but `FAIL POST …/embeddings -> 200 [{"index":0,"embedding":[[…` → `ORFARCHIV_EMBEDDING_URL` doesn't end in `/v1`.
  - `FAIL POST …/v1/embeddings -> 500 … input (… tokens) is too large` → `--batch-size` / `--ubatch-size` of `embeddings-content` are below 1024. Set both to `2048` (step 10).
  - `FAIL GET …/health -> 404` or `FAIL POST …/tokenize -> 404` while `/v1/embeddings` is `OK` → `ORFARCHIV_EMBEDDING_URL` goes through a proxy that only forwards `/v1/*`. Point it at the container directly (`http://embeddings-content:8080/v1`).
  - `-> 401` → the instance was started with `--api-key`. Set the matching `ORFARCHIV_EMBEDDING_TOKEN` on `scraper-content`, or remove the key from the internal instance.
- **A container exits right after starting with `…_RATE_LIMIT must be a positive integer and …_RATE_WINDOW a positive duration`** → fix the named variable in the compose file. All scraper commands validate all rate variables, so a typo in a content variable also stops `scraper`.
- **Many `Embedding server is unavailable, ending batch early` lines in the `scraper-content` log** → `embeddings-content` is down or restarting (`docker compose ps`, `docker compose logs embeddings-content`). The job waits `--idle-interval` and retries the same stories, so nothing is lost. Repeat the endpoint check from step 11.
- **orf.at returns 429 or 403** (log: `will be retried later: … status 429`, and `Every story in the batch failed transiently (…). Waiting before the next batch.` when orf.at refuses everything; the job then waits `--idle-interval` between batches by itself) → stop the container, halve `ORFARCHIV_CONTENT_FETCH_RATE_LIMIT` (or double the window), and restart.
- **Many `failed` results with reason `empty` in the log for one source or era** → the markup isn't covered by the shared extraction. Stop the job, report the URLs to Claude for a fix in `shared`, then reset those markers so they're retried: `updateMany({ contentStatus: "failed", source: "<SOURCE>" }, { $unset: { contentStatus: "" } })`. This also retries that source's 404s once, which is harmless.
- **All query latencies are evenly high while the content job runs** (for example ≈ 1.3–1.6 s, against below 0.1 s idle) → the two embedding servers share cores. Check that both have a `cpuset`, that the sets don't overlap, and that each `--threads` matches its number of cores (`docker compose logs <EMBEDDINGS_SERVICE> | grep -m1 n_threads`). Recreate both with `docker compose up -d <EMBEDDINGS_SERVICE> embeddings-content`.
- **Semantic search or `scrape` ticks get slow** → the VPS CPU is saturated (check `docker stats`). Move a core from `embeddings-content` to the main server (step 12), or lower `ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT`, and confirm `scraper-content` really uses the pinned instance (`docker compose exec scraper-content env | grep EMBEDDING_URL`).
- **Index stuck in `BUILDING` for longer than story 01's duration plus 50 %** → semantic search is down meanwhile. Check `docker compose logs db` for mongot errors (memory). If it doesn't recover, roll back with "Index rebuild causes trouble" (title-only definition, another rebuild). Keep `db-verify` stopped until the index is queryable.
- **`verify` flags content on M0** → a service is missing the excluded-targets variable. Fix the compose file, unset the fields on M0 with the `updateMany` from Rollback against the M0 URL, and run `verify` again.

## Acceptance criteria

- [ ] Given the verify step, when it runs, then `exit=0` and content exists only on the VPS.
- [ ] `scraper-content` runs in poll mode, and the backlog decreases daily.
- [ ] The semantic search outage during the index rebuild was no longer than the duration story 01 measured, plus 50 %.

## Technical notes

- Compose and service conventions come from epic 0001 stories 07, 10 and 12 (`scraper`, `db-backup`, `db-verify`, user `1000:1000`, file-based secrets).
- The command and env variables are documented in `scraper/README.md` (story 06) and `db/README.md` (story 05).

## Out of scope

- Enabling fused search in the UI (story 09).
