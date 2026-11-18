# 09: Relevance review and tuning

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Human
**Status:** Done
**Depends on:** 07, 08
**Estimate:** M

## User story

As the product owner, I want to judge fused against title-only results on real queries before switching, so that the change measurably improves search and the weights and thresholds are set deliberately.

## Description

Relevance is a product judgement only the user can make. Claude prepares the comparison tooling in a short follow-up if needed, but the ratings and the go/no-go are manual.

### Runbook

#### Prerequisites

- [x] Story 07's backfill has covered at least the last 12 months (check `embedded` in the 07 verify step, filtered by `timestamp`). Ideally it is complete.
- [x] Story 08's `ui` branch is pushed but **not merged**, and Vercel has built a preview deployment for it (`Project → Deployments`, environment `Preview`). Note its URL as `<PREVIEW_URL>`. A merge into `develop` would deploy it to `https://develop.orfarchiv.news` instead.
- [x] For the **Preview** scope: `ORFARCHIV_SEMANTIC_CONTENT_ENABLED=true` and `ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS=<M0_LABEL>`. Production keeps the flag off.
  - `<M0_LABEL>`: the M0 authority, for example `<cluster>.mongodb.net` (same value as in story 07).
- [x] Vercel access to the `ui` project's environment variables.
- [x] A spreadsheet or Markdown table to record ratings.

#### Steps

1. **Write the query list.** Write 20–30 queries you'd really type: a mix of topics (`Teuerung Mieten`), people, places, acronyms (`ÖBB`, `FPÖ`), and vague descriptions (`Unfall auf der Autobahn bei Glatteis`).
   **Expected:** a list in your table, one query per row.

2. **Collect title-only results.** On `https://develop.orfarchiv.news` (title-only, because `develop` does not contain the story 08 code yet), switch to semantic search and run each query. Note the top 10 titles.
   **Expected:** 10 results per query, or fewer where the score floor applies.

3. **Collect fused results.** On `<PREVIEW_URL>` (flag on), run the same queries and note the top 10.
   **Expected:** the result lists differ for at least some queries.

4. **Rate.** For each query and each mode, count the relevant results in the top 10 (0–10), and mark queries where one mode is clearly better.
   **Expected:** two numbers per query.

5. **Decide.** Summarize the average relevant@10 per mode, plus wins, losses and ties.
   - **Fused clearly better** (average relevant@10 at least 1.0 higher than title-only, and fused loses on at most 20 % of the queries): go on to step 6.
   - **Mixed:** tell Claude which queries got worse. Claude adjusts `SEMANTIC_SEARCH_CONTENT_WEIGHT` and `SEMANTIC_SEARCH_CONTENT_MIN_SCORE` on the story 08 branch and pushes. Vercel rebuilds the preview automatically. Repeat steps 3–5.
   - **Worse:** keep the flag off and report back.

6. **Enable on develop.** Production (`https://orfarchiv.news`) runs `main` (4.x), which has no semantic search yet. Story 08 reaches it only with the 5.0 release, when `develop` is merged into `main`. That release is outside this story.
   1. `develop.orfarchiv.news` is assigned to the **Preview** environment (confirmed by the user on 2026-10-19). Its `ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS` and `ORFARCHIV_SEMANTIC_CONTENT_ENABLED` are already set from the prerequisites, so nothing to change there.
   2. Add the same two variables for **Production** too, `ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS` first. The 4.x code ignores them, so fused search turns on with the 5.0 release without another step.
   3. Merge story 08's `ui` PR into `develop` in the GitHub web interface (`Pull requests → … → Merge pull request`) and wait for the `develop` deployment.
   **Expected:** the deployment succeeds, and semantic search on `https://develop.orfarchiv.news` returns fused results (spot-check 3 queries from step 1).

#### Verify

Run 3 queries from the list on `https://develop.orfarchiv.news` and compare them with your step-3 notes.
**Expected:** the top results match the fused (preview) results, not the title-only ones.

#### Rollback

In Vercel, set `ORFARCHIV_SEMANTIC_CONTENT_ENABLED` to `false` (or delete it) for **Preview**, which `develop.orfarchiv.news` uses (and Production, if the 5.0 release is already out) and redeploy. The search returns to title-only immediately, and no data changes are involved.

#### Hand back to Claude

- The ratings table (or its summary), the queries that got worse, and the decision taken.
- Final values, if they differ from what's on the branch: `SEMANTIC_SEARCH_TITLE_WEIGHT`, `SEMANTIC_SEARCH_CONTENT_WEIGHT`, `SEMANTIC_SEARCH_CONTENT_MIN_SCORE`.
- No secrets are needed.

#### Troubleshooting

- **Fused and title-only lists are identical** → the preview is probably reading from M0 (failover) or the flag isn't set for Preview. Check the Vercel env scope and the UI server logs for the chosen mode.
- **Fused results disappear or semantic search errors after a failover to M0** → `ORFARCHIV_CONTENT_EMBEDDING_EXCLUDED_TARGETS` is missing or wrong in that Vercel scope. Check the value against the M0 label and redeploy.
- **Old stories dominate the fused results** → coverage bias goes the other way than expected. Tell Claude, who can raise the recency weight.
- **Recent stories dominate because old ones lack content** → the backfill isn't far enough along. Wait and repeat steps 3–5 later.

## Acceptance criteria

- [x] Given the ratings for 20 or more queries, then fused search's average relevant@10 is at least 1.0 higher than title-only and it loses on at most 20 % of the queries, or the decision not to enable it is documented with reasons.
- [x] If enabled: Preview (used by `develop.orfarchiv.news`) and Production have `ORFARCHIV_SEMANTIC_CONTENT_ENABLED=true`, story 08 is merged into `develop`, and spot checks on `develop.orfarchiv.news` show fused results.
- [x] The final weights and thresholds are on the story 08 branch (`ui/src/lib/configs/server.ts`, by Claude, from the review) before the merge in step 6.

## Technical notes

- Constants: `ui/src/lib/configs/server.ts`. Env variable: `ui/src/env.ts`.
- All Vercel stages (Production, Preview) use the production database and embedding server (confirmed by the user on 2026-10-11), so preview queries run against live data on the VPS.
- Vercel env variable docs: https://vercel.com/docs/projects/environment-variables

## Out of scope

- An automated relevance benchmark suite.
- Tuning `SEMANTIC_SEARCH_CONTENT_MIN_SCORE` from score data. Possible follow-up after the 5.0 release: temporarily log the title and content scores per hit on real queries, then set the floor where relevant and irrelevant hits separate (see the Decision in [09-relevance-review-results.md](09-relevance-review-results.md)).
