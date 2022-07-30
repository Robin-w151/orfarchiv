import type { RequestEvent } from '@sveltejs/kit';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get(event: RequestEvent) {
  const url = getUrlSearchParam(event);
  if (!url) {
    return {
      status: 400,
    };
  }

  try {
    const data = await fetchSiteText(url);

    const document = new JSDOM(data, { url }).window.document;
    removePrintWarnings(document);

    const article = new Readability(document).parse();
    if (!article) {
      return {
        status: 404,
      };
    }

    const articleDocument = new JSDOM(article.content, { url }).window.document;
    adjustAnchorTarget(articleDocument);

    const sanitizedArticleContent = sanitizeContent(articleDocument.body.innerHTML);

    return {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=0, s-maxage=86400',
      },
      body: sanitizedArticleContent,
    };
  } catch (error: any) {
    console.warn(`Error: ${error.message}`);
    return {
      status: 500,
    };
  }
}

function getUrlSearchParam(event: RequestEvent): string | null {
  const searchParams = new URL(event.request.url).searchParams;
  return searchParams.get('url');
}

async function fetchSiteText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch site text!');
  }
  return await response.text();
}

function removePrintWarnings(document: Document): void {
  document.querySelectorAll('.print-warning').forEach((element) => {
    element.parentElement?.removeChild(element);
  });
}

function adjustAnchorTarget(document: Document): void {
  document.querySelectorAll('a').forEach((anchor) => {
    anchor.target = '_blank';
  });
}

function sanitizeContent(html: string): string {
  const DOMPurify = createDOMPurify(new JSDOM('').window as any);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });
}
