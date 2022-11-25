import { fetchStoryContent } from '$lib/backend/content/news';
import { ContentNotFoundError, OptimizedContentIsEmptyError } from '$lib/errors/errors';
import type { RequestEvent } from '@sveltejs/kit';
import { getUrlSearchParam } from '../../utils';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET(event: RequestEvent) {
  const url = getUrlSearchParam(event);
  if (!url) {
    return new Response(undefined, { status: 400 });
  }

  try {
    const content = await fetchStoryContent(url);
    return new Response(content, {
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
}
