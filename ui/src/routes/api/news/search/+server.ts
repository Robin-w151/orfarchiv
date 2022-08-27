import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { searchNews } from '$lib/db/news';
import { fromSearchParams } from '$lib/utils/searchRequest';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET(event: RequestEvent) {
  const url = new URL(event.request.url);
  const searchRequest = fromSearchParams(url.searchParams);
  const news = await searchNews(searchRequest);

  return json(news, {
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=300',
    },
  });
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST(event: RequestEvent) {
  const searchRequest = await event.request.json();
  const news = await searchNews(searchRequest);

  return json(news, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
}
