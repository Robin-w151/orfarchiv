import type { RequestEvent } from '@sveltejs/kit';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { getUrlSearchParam } from '../../utils';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET(event: RequestEvent) {
  const url = getUrlSearchParam(event);
  if (!url) {
    return new Response(undefined, { status: 400 });
  }

  try {
    const data = await fetchSiteText(url);

    const document = createDom(data, url);
    removePrintWarnings(document);

    const optimizedContent = new Readability(document).parse();
    if (!optimizedContent) {
      return new Response(undefined, { status: 404 });
    }

    const optimizedDocument = createDom(optimizedContent.content, url);
    injectSlideShowImages(optimizedDocument, createDom(data, url));
    adjustAnchorTags(optimizedDocument);

    const sanitizedArticleContent = sanitizeContent(optimizedDocument.body.innerHTML);

    return new Response(sanitizedArticleContent, {
      headers: {
        'Cache-Control': 'max-age=0, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.warn(`Error: ${error.message}`);
    return new Response(undefined, { status: 500 });
  }
}

async function fetchSiteText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch site text!');
  }
  return await response.text();
}

function createDom(data: string, url: string): Document {
  return new JSDOM(data, { url }).window.document;
}

function removePrintWarnings(document: Document): void {
  document.querySelectorAll('.print-warning').forEach((element) => {
    element.parentElement?.removeChild(element);
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
    const slideShowElement = slideShowElements[i];
    const slideShowHeader = slideShowHeaders[i];

    const imagesWrapper = optimizedDocument.createElement('div');
    const images = [...slideShowElement.querySelectorAll('img')];
    images
      .map((image) => {
        image.src = image.getAttribute('data-src') ?? '';
        image.removeAttribute('class');
        image.setAttribute('loading', 'lazy');
        return image;
      })
      .forEach((image) => imagesWrapper.appendChild(image));

    slideShowHeader.replaceWith(imagesWrapper);
  }
}

function adjustAnchorTags(document: Document): void {
  document.querySelectorAll('a').forEach((anchor) => {
    anchor.target = '_blank';
    anchor.rel = 'noopener';
  });
}

function sanitizeContent(html: string): string {
  const DOMPurify = createDOMPurify(new JSDOM('').window as any);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });
}
