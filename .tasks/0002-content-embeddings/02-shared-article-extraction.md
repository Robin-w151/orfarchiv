# 02: Shared ORF article extraction

**Epic:** [0002 Article content embeddings](README.md)
**Owner:** Claude
**Status:** Todo
**Depends on:** 01
**Estimate:** L

## User story
As a maintainer, I want one implementation of "which part of an orf.at page is the article", used by both the UI and the scraper, so that the text we embed is the same article body readers see and markup fixes happen in one place.

## Description
Move the presentation-independent part of the UI content pipeline into the `orfarchiv-shared` repo as an Effect service, and make the UI use it.

**What moves to `shared/src/storyContent.ts`:**
- `createStoryDocument(html, url)`: wraps `new JSDOM(html, { url }).window.document`, so relative links resolve against the page URL exactly as in the UI today. Fails with `StoryContentError` and `reason: 'parse'`. The UI's `DomService.createDom` (`ui/src/lib/backend/content/dom.ts`) delegates to it.
- `removeArticleNoise(document)`: the selectors from `ui/src/lib/backend/content/transform/cleanup.ts` (`.print-warning`, `p.caption.stripe-credits`, `section.stripe`, `#more-to-read`), plus the extra selectors recommended in story 01.
- `extractArticle(document, url)`: runs Readability with the existing `ALLOWED_CLASSES` and returns the optimized `Document`, built from Readability's `content` via `createStoryDocument`. Fails with `reason: 'empty'` if Readability finds nothing. The UI uses this result.
- `extractArticleText(html, url)`: parses its own DOM via `createStoryDocument`, removes noise (`removeArticleNoise`), chart embeds (`div.embed.migsys`) and `nav`, runs Readability and returns its `textContent`, normalized (whitespace collapsed, paragraphs separated by blank lines). Because it owns its DOM, it has no side effects for the caller. The scraper uses this result.
- A tagged error `StoryContentError` with `reason: 'empty' | 'parse'` and `url`.

**Contract:** `removeArticleNoise(document)` and `extractArticle(document, url)` mutate the `Document` they get, because Readability rewrites its input. The UI keeps passing them a dedicated DOM as today (`document`), separate from `originalDocument`, which it uses for read-more detection, images and the footer.

**What stays in the UI:** fetching (`FetchService`, `SiteService`), read-more detection (`AnchorService.findReadMoreUrl` with `STORY_CONTENT_READ_MORE_REGEXPS` and `isOrfStoryUrl`; the scraper doesn't follow read-more links, so there's nothing to share), metadata, chart placeholders with fetched titles, images and slideshows, footer, anchor rewriting, lists, tables, sanitizing, speech chapters, and the `StoryContent` model.

**Shape:** an Effect `Context.Service` named `StoryContentService` (id `shared/StoryContentService`), following the repo's service pattern (`make`, `layerWithoutDependencies`, `layer`; services yielded into variables first, never `(yield* Service).fn()`). DOMs are created with `createStoryDocument`, so the UI and the scraper parse pages identically. jsdom is a runtime dependency of `shared`, which is fine because every consumer of this file runs on the server (in the UI, `$common/*` is only imported under `src/lib/backend`).

**Dependencies:**
- `shared/package.json`: add `effect`, `@mozilla/readability` and `jsdom` as `peerDependencies` **and** `devDependencies` (same versions as ui: `effect@4.0.0-rc.118`, `@mozilla/readability@0.5.0`, `jsdom@30.1.1`), plus `@types/jsdom` as a devDependency. Mirror how `mongodb` is handled. Bare imports resolve against the consumer's `node_modules`, so there is only ever one jsdom instance at runtime.
- Bump `effect` and `@effect/platform-node` in the scraper to `4.0.0-rc.118` (11 files in `scraper/src` import `effect/unstable/*`). Update the imports that moved (`effect/unstable/http` → `effect/http`, `effect/unstable/cli` → `effect/cli`, `effect/unstable/persistence` → `effect/persistence`) and fix any other breaking changes. Do this first, as its own commit.
- The scraper adds `jsdom` and `@mozilla/readability` as dependencies. The ui already has both.

**UI adoption:** `CleanupService`, `DomService.createDom` and `ReadabilityService.optimizeContent` delegate to the shared service. They keep their own error mapping, so `StoryContentError('empty')` becomes `OptimizedContentIsEmptyError`. `ui/src/lib/backend/content/news.spec.ts` must pass **unchanged**. Rendered output must not change.

**Submodule sync:** commit in `shared` first, then bump the nested `shared` submodule in `ui` (`ui/src/lib/shared/common`) and `scraper` (`scraper/src/shared/common`). Also bump it in `db` (`db/src/shared/common`): `db/tsconfig.json` includes `src/**/*.ts` and would type-check `storyContent.ts` without having `@mozilla/readability` or `jsdom`, so add `"src/shared/common/src/storyContent.ts"` to its `exclude` list in the same change. Branches go in the submodules, not the root repo; ask the user before creating or switching branches.

## Acceptance criteria
- [ ] Given an ORF article fixture, when `extractArticleText` runs, then it returns the body text without print warnings, video stripes, "more to read", nav or chart embeds.
- [ ] Given a teaser page fixture, when `extractArticleText(html, url)` runs, then it returns the teaser's own text (no link is followed).
- [ ] `extractArticleText(html, url)` returns identical text when called twice with the same input.
- [ ] Given a page where Readability finds nothing, then `extractArticleText` fails with `StoryContentError` and `reason: 'empty'`.
- [ ] Given a page with relative links, when `createStoryDocument(html, url)` and `extractArticle` run, then anchors in the result resolve against `url` (`a.href` is absolute).
- [ ] `shared`: `npm run lint` and `npm test` are green with at least one fixture per markup era found in story 01.
- [ ] `ui`: `npm run lint`, `npm run check` and `npm run test:unit` are green, and `news.spec.ts` is not modified.
- [ ] `scraper` runs on `effect` and `@effect/platform-node` `4.0.0-rc.118`, and `npm run lint` and `npm test` are green.
- [ ] `db`: `npm run lint` is green after the `shared` bump.

## Technical notes
- New: `shared/src/storyContent.ts`, `shared/src/storyContent.spec.ts`, fixtures under `shared/src/fixtures/` (trimmed real pages from story 01).
- Changed: `shared/package.json`; `ui/src/lib/backend/content/dom.ts`, `ui/src/lib/backend/content/transform/{cleanup,readability}.ts`; `db/tsconfig.json`; `scraper/package.json` and every `effect/unstable/*` import in `scraper/src`.
- Pattern reference for services: `ui/src/lib/backend/content/transform/cleanup.ts`. For tagged errors: `scraper/src/shared/errors.ts`.

## Testing
- `shared`: unit specs over fixtures parsed with `createStoryDocument`.
- `ui`: the existing `news.spec.ts` acts as a regression test.
- `scraper`: existing specs after the Effect bump.

## Out of scope
- Fetching pages from the scraper (story 06).
- Changes to any UI presentation transform.
