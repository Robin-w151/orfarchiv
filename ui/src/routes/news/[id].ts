import type { RequestEvent } from '@sveltejs/kit';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get(event: RequestEvent) {
  const searchParams = new URL(event.request.url).searchParams;
  const url = searchParams.get('url');
  if (!url) {
    return {
      status: 400,
    };
  }

  const response = await fetch(url);
  const data = await response.text();
  const document = new JSDOM(data, { url });
  const article = new Readability(document.window.document).parse();
  const mainContent = extractMainContent(article?.textContent);

  return {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=86400',
    },
    body: mainContent,
  };
}

function extractMainContent(text?: string): string | undefined {
  if (!text) {
    return;
  }

  return text
    .replaceAll(/[ \r\t]{2,}/g, '')
    .replaceAll(/(\n){2,}/g, '\n')
    .split('\n')
    .reduce((largestSection, section) => (section.length > largestSection.length ? section : largestSection), '');
}
