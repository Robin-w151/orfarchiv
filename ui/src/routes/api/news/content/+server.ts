import { fetchStoryContent } from '$lib/backend/content/news';
import { ContentNotFoundError, OptimizedContentIsEmptyError } from '$lib/errors/errors';
import { json } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { getFetchReadMoreContentSearchParam, getUrlSearchParam } from '$lib/backend/utils/searchParams';

export const GET = (async (event: RequestEvent) => {
  const url = getUrlSearchParam(event);
  if (!url) {
    return new Response(undefined, { status: 400 });
  }

  try {
    const fetchReadMoreContent = getFetchReadMoreContentSearchParam(event);
    const content = await fetchStoryContent(url, fetchReadMoreContent);
    return json(content, {
      headers: {
        'Cache-Control': 'max-age=0, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.warn(`Error: ${error.message}`);

    if (error instanceof ContentNotFoundError || error instanceof OptimizedContentIsEmptyError) {
      return new Response(undefined, { status: 404 });
    }

    return new Response(undefined, { status: 500 });
  }
}) satisfies RequestHandler;
