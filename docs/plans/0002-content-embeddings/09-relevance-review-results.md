# 09: Relevance review results

**Story:** [09 Relevance review and tuning](09-relevance-review-tuning.md)
**Reviewer:**
**Date:**

## Setup

| Item                    | Value                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `<PREVIEW_URL>`         | [Preview](https://orfarchiv-git-feat-content-embeddings-robins-projects-bb10f956.vercel.app) |
| `ui` branch / commit    | feat/content-embeddings                                                                      |
| Backfill frontier       | 2022-07-06T10:50:00.000Z                                                                     |
| Last 12 months done     | ✅                                                                                           |
| Total embedded / failed | 445554/3208                                                                                  |

Settings under review (`ui/src/lib/configs/server.ts`):

| Constant                            | Value |
| ----------------------------------- | ----- |
| `SEMANTIC_SEARCH_TITLE_WEIGHT`      | 1     |
| `SEMANTIC_SEARCH_CONTENT_WEIGHT`    | 1     |
| `SEMANTIC_SEARCH_TITLE_MIN_SCORE`   | 0.79  |
| `SEMANTIC_SEARCH_CONTENT_MIN_SCORE` | 0.76  |
| `SEMANTIC_SEARCH_RECENCY_WEIGHT`    | 0     |

## Ratings

- **Type:** topic, person, place, company, acronym, vague
- **Title / Fused:** relevant results in the top 10 (0–10)
- **Winner:** `fused`, `title` or `tie` (only where one mode is clearly better)

| #   | Query                                      | Type    | Title | Fused | Winner | Notes                                                   |
| --- | ------------------------------------------ | ------- | ----- | ----- | ------ | ------------------------------------------------------- |
| 1   | Rene Benko                                 | Person  | 10    | 10    | tie    |                                                         |
| 2   | Rheinmetall                                | Company | 6     | 7     | tie    | both add Metaller stories                               |
| 3   | Pflegekräftemangel                         | Topic   | 10    | 10    | tie    |                                                         |
| 4   | Beyond Gravity Austria                     | Company | 0     | 1     | tie    | title-only all "Austria" sport, fused 1 hit             |
| 5   | Stellenabbau Automobilbranche              | Topic   | 7     | 10    | fused  |                                                         |
| 6   | SPÖ Vorsitz Auszählungspanne               | Topic   | 1     | 4     | fused  | title-only mostly other SPÖ leadership news             |
| 7   | Hund stürzt ab                             | Vague   | 9     | 9     | tie    |                                                         |
| 8   | Sabotage                                   | Topic   | 4     | 10    | fused  |                                                         |
| 9   | Uni Einsparungen                           | Topic   | 4     | 9     | fused  | title-only adds generic "sparen" stories                |
| 10  | niedrige Grundwasserpegel                  | Topic   | 10    | 10    | tie    |                                                         |
| 11  | Peter Filzmaier                            | Person  | 10    | 10    | tie    |                                                         |
| 12  | Pagerattacke Hisbollah                     | Topic   | 2     | 3     | tie    | both mostly general Hisbollah                           |
| 13  | Weltraumteleskop                           | Topic   | 10    | 10    | tie    |                                                         |
| 14  | Belästigung Luxushotel                     | Vague   | 1     | 1     | tie    | both find the real story at #1                          |
| 15  | Bad Goisern                                | Place   | 1     | 10    | fused  | title-only 1 result, fused finds stories by body        |
| 16  | AMS                                        | Acronym | 10    | 10    | tie    |                                                         |
| 17  | IRIS-T                                     | Acronym | 0     | 1     | tie    | no title-only results, fused confuses IRIS-T with IRIS² |
| 18  | James Webb Space Teleskop                  | Topic   | 8     | 10    | fused  |                                                         |
| 19  | Vulkanausbruch in Österreich               | Vague   | 0     | 0     | tie    | no-answer query, both return foreign volcanoes          |
| 20  | Autobahnunfall bei Blitzeis                | Vague   | 3     | 4     | tie    | both include lightning and unrelated crashes            |
| 21  | Broadway                                   | Place   | 0     | 8     | fused  | no title-only results                                   |
| 22  | Sri Lanka                                  | Place   | 10    | 10    | tie    |                                                         |
| 23  | Lesbos                                     | Place   | 0     | 9     | fused  | no title-only results                                   |
| 24  | Loxone                                     | Company | 1     | 2     | tie    |                                                         |
| 25  | Podcast mit Peter Filzmaier und Armin Wolf | Vague   | 0     | 0     | tie    | "Professor und der Wolf" found by neither               |

## Summary

| Metric                     | All        |
| -------------------------- | ---------- |
| Queries                    | 25         |
| Average relevant@10, title | 4.68       |
| Average relevant@10, fused | 6.72       |
| Difference (fused − title) | +2.04      |
| Fused wins / losses / ties | 8 / 0 / 17 |
| Fused losses in %          | 0.0 %      |

Go criteria (all queries): difference ≥ 1.0 and fused losses ≤ 20 %.

## Problem queries

For every query where fused lost or the result list looked wrong. Observations to watch for: weak content hits above the floor, recent stories pushed over better old ones, relevant title hits pushed out of the top 10.

Fused lost on no query. These four looked wrong in both modes; the full lists are in [09-relevance-review-lists.md](09-relevance-review-lists.md).

### Query: Beyond Gravity Austria (#4)

- **Title-only top 10:** 0 relevant, all sport stories matching "Austria"/"Österreich".
- **Fused top 10:** 1 relevant (#4 "Weltraum-Teleskop aus Oberösterreich", which names Beyond Gravity in the body), the rest generic Austria news.
- **What went wrong:** the company name barely appears in the archive; both modes fill the list with weak matches on "Austria".

### Query: Pagerattacke Hisbollah (#12)

- **Title-only top 10:** 2 relevant, the rest general Israel–Hisbollah fighting.
- **Fused top 10:** 3 relevant (incl. the walkie-talkie explosions), the rest general Israel–Hisbollah fighting.
- **What went wrong:** the specific event is drowned out by the broader topic in both modes.

### Query: IRIS-T (#17)

- **Title-only top 10:** no results.
- **Fused top 10:** 4 results, 1 relevant ("Deutsches Flugabwehrsystem bereits im Einsatz"); 3 are about the EU IRIS² satellite programme.
- **What went wrong:** short acronym with a hyphen; content matching confuses it with IRIS².

### Query: Vulkanausbruch in Österreich (#19)

- **Title-only top 10:** 0 relevant, foreign volcanoes and "Austria" sport stories.
- **Fused top 10:** 0 relevant, foreign volcanoes.
- **What went wrong:** no-answer query; both modes return weak hits instead of an empty list. Fused is no worse than title-only here.

## Tuning rounds

One row per change Claude pushes to the preview (steps 3–5 repeated).

| Round | Change  | Title weight | Content weight | Content min score | Avg title | Avg fused | Losses | Result |
| ----- | ------- | ------------ | -------------- | ----------------- | --------- | --------- | ------ | ------ |
| 0     | initial | 1            | 1              | 0.76              | 4.68      | 6.72      | 0 / 25 | go     |

## Decision

- [x] Fused clearly better: enable in production (step 6)
- [ ] Mixed: tune and repeat
- [ ] Worse: keep the flag off

**Reason:** On 25 queries, fused averages 6.72 relevant@10 against 4.68 for title-only (+2.04, criterion ≥ 1.0) and loses on none (criterion ≤ 20 %). It wins mainly where the topic is only in the article body (Bad Goisern, Uni Einsparungen, Sabotage) and where title-only returns nothing (Broadway, Lesbos). Ties are either already good in both modes or poor in both (see Problem queries); no tuning needed.

**Why no tuning:** The problem queries (#4, #12, #17, #19) fail in both modes because of the query itself (rare name, acronym, no real answer), so changing the weights would not help them. Raising `SEMANTIC_SEARCH_CONTENT_MIN_SCORE` would cut some weak fill-in hits, but most likely also the wins that come only from the article body, which are probably the hits with the lower content scores. The search API does not return scores, so a new floor could only be guessed and checked with another full rating round. The title threshold (0.79), which leaves Broadway and Lesbos empty in title-only mode, stays as it is by design of the epic, and fused search covers those cases.

**Final values** (if different from the branch): none, the branch values stay.

## Develop check

Three queries from the ratings, run on `https://develop.orfarchiv.news` after step 6.

| Query       | Matches the fused preview results? | Notes                                                            |
| ----------- | ---------------------------------- | ---------------------------------------------------------------- |
| Bad Goisern | ✅ 10/10, same order                | title-only had 1 result                                          |
| Broadway    | ✅ 10/10, same order                | title-only had no results                                        |
| Lesbos      | ✅ 10/10, same order                | title-only had no results; checked 2026-10-19 on `5.0.0-next.19` |