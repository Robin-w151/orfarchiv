import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { ContentNotFoundError, OptimizedContentIsEmptyError } from '$lib/errors/errors';
import { isOrfStoryUrl } from '$lib/backend/utils/urls';
import type { StoryContent, StorySource } from '$lib/models/story';
import { searchStory } from '$lib/backend/db/news';
import { logger, STORY_CONTENT_READ_MORE_REGEXPS } from '$lib/configs/server';

export async function fetchStoryContent(url: string, fetchReadMoreContent = false): Promise<StoryContent> {
  logger.info(`Fetch content with url='${url}' and fetchReadMoreContent='${fetchReadMoreContent}'`);

  let currentUrl = url;
  let currentData = await fetchSiteHtmlText(currentUrl);
  let id;
  let source;
  let originalDocument = createDom(currentData, currentUrl);

  if (fetchReadMoreContent) {
    const readMoreUrl = findReadMoreUrl(originalDocument);

    if (readMoreUrl) {
      try {
        logger.info(`Fetch content with readMore url='${readMoreUrl}'`);
        const [story, data] = await Promise.all([searchStory(readMoreUrl), fetchSiteHtmlText(readMoreUrl)]);

        currentUrl = readMoreUrl;
        currentData = data;
        id = story?.id;
        source = story?.source ?? findSourceFromUrl(currentUrl);
        originalDocument = createDom(currentData, currentUrl);
      } catch (error: unknown) {
        logger.warn(`${(error as Error).message}`);
      }
    }
  }

  const document = createDom(currentData, currentUrl);
  removePrintWarnings(document);

  const optimizedContent = new Readability(document).parse();
  if (!optimizedContent) {
    logger.warn(`Error transforming content with url='${currentUrl}'`);
    throw new OptimizedContentIsEmptyError(`Optimized content from url='${currentUrl}' is empty`);
  }

  const optimizedDocument = createDom(optimizedContent.content, currentUrl);
  removeSiteNavigation(optimizedDocument);
  removeSiteAnchors(optimizedDocument);
  injectSlideShowImages(optimizedDocument, originalDocument);
  injectStoryFooter(optimizedDocument, originalDocument);
  adjustAnchorTags(optimizedDocument);
  adjustTables(optimizedDocument);

  const storySource = source ? ({ name: source, url: currentUrl } satisfies StorySource) : undefined;

  return {
    content: sanitizeContent(optimizedDocument.body.innerHTML),
    id,
    source: storySource,
  };
}

async function fetchSiteHtmlText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ContentNotFoundError(`Content from url='${url}' cannot be loaded`);
  }
  return response.text();
}

function createDom(data: string, url: string): Document {
  return new JSDOM(data, { url }).window.document;
}

function findReadMoreUrl(originalDocument: Document): string | null {
  return [...originalDocument.querySelectorAll('p')]
    .filter((p) => {
      const text = p.textContent;
      if (!text) {
        return false;
      }
      if (!STORY_CONTENT_READ_MORE_REGEXPS.some((regexp) => !!text.match(regexp))) {
        return false;
      }

      const anchor = p.querySelector('a');
      return isOrfStoryUrl(anchor?.href);
    })
    .map((p) => p.querySelector('a')?.href ?? '')[0];
}

function findSourceFromUrl(url: string): string | undefined {
  return /^https:\/\/(?<source>\w+)\.orf\.at/i.exec(url)?.groups?.source;
}

function removePrintWarnings(optimizedDocument: Document): void {
  optimizedDocument.querySelectorAll('.print-warning').forEach((element) => {
    element.remove();
  });
}

function removeSiteNavigation(optimizedDocument: Document): void {
  optimizedDocument.querySelectorAll('nav').forEach((navigation) => {
    navigation.remove();
  });
}

function removeSiteAnchors(optimizedDocument: Document): void {
  optimizedDocument.querySelectorAll('a').forEach((anchor) => {
    if (RegExp(/orf\.at.*#/i).exec(anchor.href)) {
      anchor.remove();
    }
  });
}

function injectSlideShowImages(optimizedDocument: Document, originalDocument: Document): void {
  const slideShowRegexp = /^fotostrecke mit/i;
  const slideShowElements = [...originalDocument.querySelectorAll('.oon-slideshow')] as Array<HTMLElement>;
  const slideShowHeaders = [...optimizedDocument.querySelectorAll('h3')].filter((header) =>
    slideShowRegexp.test(header.textContent ?? ''),
  );

  if (slideShowElements.length !== slideShowHeaders.length) {
    return;
  }

  for (let i = 0; i < slideShowElements.length; i++) {
    const slideShowSection = slideShowElements[i];
    const slideShowHeader = slideShowHeaders[i];

    if (slideShowHeader.parentElement?.querySelector('h3 + div')) {
      continue;
    }

    const slideShowList = slideShowSection.querySelector('.oon-slideshow-list');
    slideShowList?.removeAttribute('class');

    const footers = [...slideShowSection.querySelectorAll('figure > footer')];
    footers.forEach((footer) => {
      footer.parentElement?.removeChild(footer);
    });

    const images = [...slideShowSection.querySelectorAll('img')];
    images.forEach((image) => {
      image.src = image.getAttribute('data-src') ?? '';
      image.srcset = image.getAttribute('data-srcset') ?? '';
      image.removeAttribute('class');
      image.setAttribute('loading', 'lazy');
      return image;
    });

    if (slideShowList) {
      slideShowHeader.after(slideShowList);
    }
  }
}

function injectStoryFooter(optimizedDocument: Document, originalDocument: Document): void {
  const storyFooter = originalDocument.querySelector('.story-footer');
  if (storyFooter) {
    optimizedDocument.body.appendChild(storyFooter);
  }
}

function adjustAnchorTags(optimizedDocument: Document): void {
  optimizedDocument.querySelectorAll('a').forEach((anchor) => {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  });
}

function adjustTables(optimizedDocument: Document): void {
  optimizedDocument.querySelectorAll('table').forEach((table) => {
    const tableColumns = table.tHead?.rows[0]?.cells.length ?? 0;

    if (tableColumns === 0) {
      table.remove();
      return;
    }

    const columnHasContent: Array<boolean> = Array(tableColumns).fill(false);
    let isTableValid = true;

    [...table.rows].forEach((tableRow) => {
      [...tableRow.children].forEach((tableCell, index) => {
        if (index < columnHasContent.length) {
          if (tableCell.innerHTML) {
            columnHasContent[index] = true;
          }
        } else {
          isTableValid = false;
        }
      });
    });

    if (!isTableValid) {
      table.remove();
      return;
    }

    [...table.rows].forEach((tableRow) => {
      [...tableRow.cells].forEach((tableCell, index) => {
        if (!columnHasContent[index]) {
          tableCell.remove();
        }
      });
    });
  });
}

function sanitizeContent(html: string): string {
  const DOMPurify = createDOMPurify(new JSDOM('').window as unknown as Window);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
    FORBID_ATTR: ['tabindex'],
  });
}
