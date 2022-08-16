import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { searchNews } from '$lib/db/news';

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
