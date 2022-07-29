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
  if (!article) {
    return {
      status: 404,
    };
  }

  const articleDocument = new JSDOM(article.content, { url });
  articleDocument.window.document.querySelectorAll('a').forEach((anchor) => {
    anchor.target = '_blank';
  });
  const articleContent = articleDocument.window.document.body.innerHTML;

  return {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=86400',
    },
    body: articleContent,
  };
}
