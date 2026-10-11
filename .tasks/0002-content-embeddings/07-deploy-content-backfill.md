# 07: Deploy and run content backfill

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Human
**Status:** Todo
**Depends on:** 06
**Estimate:** M (hands-on), plus several days of unattended backfill

## User story
As the operator, I want the new schema applied on production and the `embed-content` job running on the VPS, so that the archive gets content embeddings while M0 stays untouched.

## Description
This must be done manually because it changes production systems (VPS compose stack, live MongoDB index, released images) that Claude can't reach.

### Runbook

#### Prerequisites
- [ ] Stories 04, 05 and 06 are merged, and `db` and `scraper` releases are published to ghcr (`ghcr.io/robin-w151/orfarchiv-db`, `ghcr.io/robin-w151/orfarchiv-scraper`). Note both versions.
- [ ] SSH to the VPS (`<vps>` = your SSH host alias) and the compose directory (`<compose-dir>`) from epic 0001.
- [ ] The M0 label `<cluster>.mongodb.net` and the VPS label `db1.orfarchiv.news:27017` at hand.
- [ ] The existing embedding server on the VPS: its compose service name (`<EMBEDDINGS_SERVICE>`), its model volume, and the URL `scraper` uses (`ORFARCHIV_EMBEDDING_URL`).
- [ ] The truncation limit recommended by story 01.
- [ ] Starting values for the CPU cap and threads (for example `1.5` / `1`). Step 12 calibrates them.
- [ ] The fetch rate: `10` per `1 second` (confirmed).
- [ ] The User-Agent string chosen in story 06, for `ORFARCHIV_CONTENT_USER_AGENT`.
- [ ] `ORFARCHIV_DB_RW_URL` for the count query in Verify and the full revert in Rollback, as defined in epic 0001 story 08 (read the password with `read -rs`).
- [ ] A `tmux` session on the VPS.

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
   **Expected:** both list the VPS with `content: yes` and M0 with `content: no`, and there's no warning about an unknown excluded label.

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

10. **Add a CPU-capped embedding instance for the content job.** Search queries keep the existing embedding server to themselves. Add this service to `docker-compose.yml` by copying `<EMBEDDINGS_SERVICE>`'s image, model arguments, network and model volume, without publishing a port:
   ```yaml
   embeddings-content:
     image: ghcr.io/ggml-org/llama.cpp:server
     command: ['-hf', 'ggml-org/embeddinggemma-300m-qat-q8_0-GGUF', '--embeddings', '--host', '0.0.0.0', '--threads', '<THREADS>', '--batch-size', '<UBATCH>', '--ubatch-size', '<UBATCH>']
     cpus: <CPU_CAP>
     volumes:
       - <MODELS_VOLUME>:/root/.cache/llama.cpp
     restart: unless-stopped
   ```
   - `<CPU_CAP>` / `<THREADS>`: starting values, for example `1.5` / `1`, calibrated in step 12.
   - `<UBATCH>`: `2048`, as in the devcontainer (story 00). Without it, inputs over 512 tokens fail with HTTP 500.
   - `<MODELS_VOLUME>`: the model cache volume of `<EMBEDDINGS_SERVICE>`, so the model isn't downloaded twice.
   ```bash
   docker compose up -d embeddings-content
   docker compose logs --since 2m embeddings-content
   ```
   **Expected:** the log ends with the server listening on port 8080, and `docker stats --no-stream embeddings-content` shows CPU at or below the cap and memory roughly as noted in story 00 step 3.

11. **Add the content job container.** Add a service to `docker-compose.yml` by copying `scraper`'s `image`, `environment`, secrets and `user`, and change:
   ```yaml
   scraper-content:
     image: ghcr.io/robin-w151/orfarchiv-scraper:<SCRAPER_VERSION>
     command: ['embed-content', '--poll']
     environment:
       # everything scraper has, plus:
       ORFARCHIV_EMBEDDING_URL: "http://embeddings-content:8080"
       ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS: "<M0_LABEL>"
       ORFARCHIV_CONTENT_FETCH_RATE_LIMIT: "10"
       ORFARCHIV_CONTENT_FETCH_RATE_WINDOW: "1 second"
       ORFARCHIV_CONTENT_USER_AGENT: "<USER_AGENT>"
       ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT: "<CONTENT_EMBED_LIMIT>"
       ORFARCHIV_CONTENT_EMBEDDING_RATE_WINDOW: "1 minute"
     restart: unless-stopped
   ```
   - `<USER_AGENT>`: the User-Agent string chosen in story 06.
   - `<CONTENT_EMBED_LIMIT>`: start high (for example `120`), so the CPU cap is what limits throughput. Lower it in step 12 if needed.
   - `ORFARCHIV_EMBEDDING_URL` points at the capped instance from step 10 and overrides the value copied from `scraper`.
   **Expected:** `docker compose config -q` is silent.

12. **Dry run and calibrate the cap.** Start a limited run, and meanwhile measure query latency on the main embedding server, as the UI experiences it:
    ```bash
    docker compose run --rm scraper-content embed-content --max-docs 100
    # in a second tmux pane, while the run is busy:
    for i in $(seq 20); do curl -s -o /dev/null -w '%{time_total}\n' -X POST <MAIN_EMBEDDING_URL>/embeddings -H 'content-type: application/json' -d '{"input":["task: search result | query: Teuerung"]}'; done | sort -n
    ```
    - `<MAIN_EMBEDDING_URL>`: the `ORFARCHIV_EMBEDDING_URL` of `scraper` (the uncapped instance).
    **Expected:** about 100 processed, mostly `embedded`, a few `failed` at most, no `failed` target. The 19th of the 20 latencies (p95) is below 1 s, and the run processes ≥ 25 docs/min (from the log's duration; the fetch rate allows up to 600, so the capped embedding instance is the limit). Otherwise, lower `cpus:` and `--threads` if latency is too high, or raise them if throughput is too low, run `docker compose up -d embeddings-content`, and repeat. If throughput is below target while the embedding instance's CPU is not at its cap, raise `--batch-size` (for example to 50) and repeat. Note the final values for the handoff.

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
- The calibrated `cpus:`, `--threads`, `--batch-size` and `ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT`, plus the measured docs/min and query p95.
- The daily backlog numbers (for story 09's timing decision).
- Anything odd in the logs: many `failed` with reason `empty` from one source, 429 or 403 from orf.at.
- No secrets are needed.

#### Troubleshooting
- **orf.at returns 429 or 403** → stop the container, halve `ORFARCHIV_CONTENT_FETCH_RATE_LIMIT` (or double the window), and restart.
- **Many `failed` results with reason `empty` in the log for one source or era** → the markup isn't covered by the shared extraction. Stop the job, report the URLs to Claude for a fix in `shared`, then reset those markers so they're retried: `updateMany({ contentStatus: "failed", source: "<SOURCE>" }, { $unset: { contentStatus: "" } })`. This also retries that source's 404s once, which is harmless.
- **Semantic search or `scrape` ticks get slow** → the VPS CPU is saturated (check `docker stats`). Lower `cpus:` on `embeddings-content`, or lower `ORFARCHIV_CONTENT_EMBEDDING_RATE_LIMIT`, and confirm `scraper-content` really uses the capped instance (`docker compose exec scraper-content env | grep EMBEDDING_URL`).
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
