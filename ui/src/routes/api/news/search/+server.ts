import { json } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { searchNews } from '$lib/backend/db/news';
import { fromSearchParams } from '$lib/utils/searchRequest';

export const GET = (async (event: RequestEvent) => {
  const url = new URL(event.request.url);
  const searchRequest = fromSearchParams(url.searchParams);
  const news = await searchNews(searchRequest);

  return json(news, {
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=300',
    },
  });
}) satisfies RequestHandler;
