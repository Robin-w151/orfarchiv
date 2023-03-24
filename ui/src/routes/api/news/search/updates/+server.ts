import { checkNewsUpdatesAvailable } from '$lib/backend/db/news';
import { fromSearchParams } from '$lib/utils/searchRequest';
import { json, type RequestEvent, type RequestHandler } from '@sveltejs/kit';

export const GET = (async (event: RequestEvent) => {
  const url = new URL(event.request.url);
  const searchRequest = fromSearchParams(url.searchParams);
  const newsUpdates = await checkNewsUpdatesAvailable(searchRequest);

  return json(newsUpdates, {
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=300',
    },
  });
}) satisfies RequestHandler;
