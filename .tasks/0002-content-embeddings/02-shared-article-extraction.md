# 02: Shared ORF article extraction

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Done
**Depends on:** 01
**Estimate:** L

## User story
As a maintainer, I want one implementation of "which part of an orf.at page is the article", used by both the UI and the scraper, so that the text we embed is the same article body readers see and markup fixes happen in one place.

## Description
Move the presentation-independent part of the UI content pipeline into the `orfarchiv-shared` repo as an Effect service, and make the UI use it.

**What moves to `shared/src/storyContent.ts`:**
- `createStoryDocument(html, url)`: wraps `new JSDOM(html, { url }).window.document`, so relative links resolve against the page URL exactly as in the UI today. Fails with `StoryContentError` and `reason: 'parse'`. The UI's `DomService.createDom` (`ui/src/lib/backend/content/dom.ts`) delegates to it.
- `removeArticleNoise(document)`: the selectors from `ui/src/lib/backend/content/transform/cleanup.ts` (`.print-warning`, `p.caption.stripe-credits`, `section.stripe`, `#more-to-read`). Nothing else, so the UI's rendered output stays the same.
- `extractArticle(document, url)`: runs Readability with the existing `ALLOWED_CLASSES` and returns the optimized `Document`, built from Readability's `content` via `createStoryDocument`. Fails with `reason: 'empty'` if Readability finds nothing. The UI uses this result.
- `extractArticleText(html, url)`: parses its own DOM via `createStoryDocument`, removes noise (`removeArticleNoise`), the text-only noise selectors from story 01 (`TEXT_NOISE_SELECTORS`: `.story-meta-dates`, `.sr-only`, `p.credit`, `.storyMeta`, `p.toplink`, `p.backlink`, `div.remote`, plus `.image-credit-tag` for the fm4 mosaik markup, see Technical notes; dates, credits and screen-reader labels that the UI still shows), chart embeds (`div.embed.migsys`) and `nav`, runs Readability and returns its `textContent`, normalized (whitespace collapsed, paragraphs separated by blank lines). Because it owns its DOM, it has no side effects for the caller. The scraper uses this result.
- A tagged error `StoryContentError` with `reason: 'empty' | 'parse'` and `url`.

**Contract:** `removeArticleNoise(document)` and `extractArticle(document, url)` mutate the `Document` they get, because Readability rewrites its input. The UI keeps passing them a dedicated DOM as today (`document`), separate from `originalDocument`, which it uses for read-more detection, images and the footer.

**What stays in the UI:** fetching (`FetchService`, `SiteService`), read-more detection (`AnchorService.findReadMoreUrl` with `STORY_CONTENT_READ_MORE_REGEXPS` and `isOrfStoryUrl`; the scraper doesn't follow read-more links, so there's nothing to share), metadata, chart placeholders with fetched titles, images and slideshows, footer, anchor rewriting, lists, tables, sanitizing, speech chapters, and the `StoryContent` model.

**Shape:** an Effect `Context.Service` named `StoryContentService` (id `shared/StoryContentService`), following the repo's service pattern (`make`, `layerWithoutDependencies`, `layer`; services yielded into variables first, never `(yield* Service).fn()`). DOMs are created with `createStoryDocument`, so the UI and the scraper parse pages identically. jsdom is a runtime dependency of `shared`, which is fine because every consumer of this file runs on the server (in the UI, `$common/*` is only imported under `src/lib/backend`).

**Dependencies:**
- `shared/package.json`: add `effect`, `@mozilla/readability` and `jsdom` as `peerDependencies` **and** `devDependencies` (same versions as ui: `effect@4.0.2`, `@mozilla/readability@0.5.0`, `jsdom@30.1.1`), plus `@types/jsdom` as a devDependency. Mirror how `mongodb` is handled. Bare imports resolve against the consumer's `node_modules`, so there is only ever one jsdom instance at runtime.
- Bump Effect to the stable `4.0.2` in all repos (decided by the user on 2026-10-11, replacing the plan to align on `4.0.0-rc.118`): `effect` and `@effect/platform-node` in the scraper (from `rc.117`) and db, `effect` and `@effect/vitest` in the ui. In the scraper, 11 files import `effect/unstable/*`; update the imports that moved (`effect/unstable/http` → `effect/http`, `effect/unstable/cli` → `effect/cli`, `effect/unstable/persistence` → `effect/persistence`) and fix any other breaking changes. Do this first, as its own commit per repo. With an existing lockfile, npm reports a peer conflict (`ERESOLVE`) when both packages change at once; remove the `effect` and `@effect/*` entries from `package-lock.json` and run `npm install` again.
- The scraper adds `jsdom` and `@mozilla/readability` as dependencies. The ui already has both.

**UI adoption:** `CleanupService`, `DomService.createDom` and `ReadabilityService.optimizeContent` delegate to the shared service (`CleanupService.removeArticleNoise` replaces `removePrintWarnings`, `removeVideo` and `removeMoreToReadSection`; `removeSiteNavigation` stays in the UI). They keep their own error mapping, so `StoryContentError('empty')` becomes `OptimizedContentIsEmptyError`. `ui/src/lib/backend/content/news.spec.ts` must pass **unchanged**. Rendered output must not change.

**Submodule sync:** commit in `shared` first, then bump the nested `shared` submodule in `ui` (`ui/src/lib/shared/common`) and `scraper` (`scraper/src/shared/common`). Also bump it in `db` (`db/src/shared/common`): `db/tsconfig.json` includes `src/**/*.ts` and would type-check `storyContent.ts` without having `@mozilla/readability` or `jsdom`, so add `"src/shared/common/src/storyContent.ts"` to its `exclude` list in the same change. Branches go in the submodules, not the root repo; ask the user before creating or switching branches.

## Acceptance criteria
- [x] Given an ORF article fixture, when `extractArticleText` runs, then it returns the body text without print warnings, video stripes, "more to read", nav or chart embeds.
- [x] Given a teaser page fixture, when `extractArticleText(html, url)` runs, then it returns the teaser's own text (no link is followed).
- [x] `extractArticleText(html, url)` returns identical text when called twice with the same input.
- [x] Given a page where Readability finds nothing, then `extractArticleText` fails with `StoryContentError` and `reason: 'empty'`.
- [x] Given a page with relative links, when `createStoryDocument(html, url)` and `extractArticle` run, then anchors in the result resolve against `url` (`a.href` is absolute).
- [x] `shared`: `npm run lint` and `npm test` are green with at least one fixture per markup family found in story 01 (`story-lead`/`story-story`, e.g. a regional story, and `storyText`, e.g. an fm4 story), plus a teaser.
- [x] `ui`: `npm run lint`, `npm run check` and `npm run test:unit` are green, and `news.spec.ts` is not modified.
- [x] `scraper`, `db` and `ui` run on `effect` `4.0.2` (and `@effect/platform-node` / `@effect/vitest` `4.0.2`), and in the scraper `npm run lint` and `npm test` are green.
- [x] `db`: `npm run lint` is green after the `shared` bump.

## Technical notes
- New: `shared/src/storyContent.ts`, `shared/src/storyContentConfig.ts` (`ALLOWED_CLASSES` and the selector constants, free of jsdom/Readability imports), `shared/src/storyContent.spec.ts`, fixtures under `shared/src/fixtures/` (real pages fetched on 2026-10-11, the story 01 cache was gone; scripts, styles, SVGs, srcsets and comments stripped, extracted text checked identical to the untrimmed page): `regional-story.html` (`story-lead`/`story-story`, wien), `fm4-story-text.html` (`storyText`, fm4 2025), `fm4-mosaik.html` (new fm4 markup, see below) and `news-teaser.html` (news → steiermark teaser). `shared/.prettierignore` excludes `src/fixtures/`, and each consumer's `.prettierignore` excludes the fixtures inside its `shared` submodule (`ui`: `src/lib/shared/common/src/fixtures/`; `scraper` and `db`: `src/shared/common/src/fixtures/`, each in a new `.prettierignore`), because their `prettier --check .` walks into the submodule. The ui and scraper test runs also pick up `storyContent.spec.ts` from the submodule; db excludes `src/shared/common/**` in its vitest config. Video stripes and chart embeds occur in none of the sampled pages, so the spec injects them.
- **Third markup family (found during this story):** fm4 switched to a new Nuxt-based "mosaik" layout in 2026 (`mosaik-story-lead`, no `storyText`), which story 01's sample did not contain. It extracts cleanly except that photo credits (`span.image-credit-tag`, e.g. "EBU") leak in as lines, so `.image-credit-tag` is an eighth `TEXT_NOISE_SELECTORS` entry (text only; the UI keeps showing credits). On 129 fetched pages it only changed the three mosaik pages, removing only their credits. The chart selector `div.embed.migsys` is exported separately as `CHART_SELECTOR`.
- Changed: `shared/package.json`; `ui/src/lib/backend/content/dom.ts`, `ui/src/lib/backend/content/transform/{cleanup,readability}.ts`; `db/tsconfig.json`; `package.json` of scraper, db and ui (Effect 4.0.2) and every `effect/unstable/*` import in `scraper/src`.
- Pattern reference for services: `ui/src/lib/backend/content/transform/cleanup.ts`. For tagged errors: `scraper/src/shared/errors.ts`.

## Testing
- `shared`: unit specs over fixtures parsed with `createStoryDocument`.
- `ui`: the existing `news.spec.ts` acts as a regression test.
- `scraper`: existing specs after the Effect bump.

## Out of scope
- Fetching pages from the scraper (story 06).
- Changes to any UI presentation transform.
