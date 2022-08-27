import type { RequestEvent } from '@sveltejs/kit';
import { getUrlSearchParam } from '../../utils';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET(event: RequestEvent) {
  const url = getUrlSearchParam(event);
  if (!url) {
    return new Response(undefined, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return new Response(undefined, { status: 404 });
    }

    const data = await response.arrayBuffer();

    return new Response(data, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? '',
        'Cache-Control': 'max-age=604800, s-maxage=604800',
      },
    });
  } catch (error) {
    return new Response(undefined, { status: 500 });
  }
}
