import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { ContentNotFoundError, OptimizedContentIsEmptyError } from '$lib/errors/errors';

export async function fetchStoryContent(url: string): Promise<string> {
  const data = await fetchSiteHtmlText(url);

  const document = createDom(data, url);
  removePrintWarnings(document);

  const optimizedContent = new Readability(document).parse();
  if (!optimizedContent) {
    throw new OptimizedContentIsEmptyError(`Optimized content from url '${url}' is empty`);
  }

  const optimizedDocument = createDom(optimizedContent.content, url);
  const originalDocument = createDom(data, url);
  removeSiteNavigation(optimizedDocument);
  removeSiteAnchors(optimizedDocument);
  injectSlideShowImages(optimizedDocument, originalDocument);
  injectStoryFooter(optimizedDocument, originalDocument);
  adjustAnchorTags(optimizedDocument);
  adjustTables(optimizedDocument);

  return sanitizeContent(optimizedDocument.body.innerHTML);
}

async function fetchSiteHtmlText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ContentNotFoundError(`Content from url '${url}' cannot be loaded`);
  }
  return response.text();
}

function createDom(data: string, url: string): Document {
  return new JSDOM(data, { url }).window.document;
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
    if (anchor.href.match(/orf\.at.*#/i)) {
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
    console.log(tableColumns);

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

    console.log(columnHasContent);
    console.log(isTableValid);

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
  const DOMPurify = createDOMPurify(new JSDOM('').window as any);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });
}
