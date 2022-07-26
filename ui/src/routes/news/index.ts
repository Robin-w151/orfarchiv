import { findNews } from '../../lib/db/news';
import type { RequestEvent } from '@sveltejs/kit';
import type { NextKey } from '../../lib/models/news';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get(event: RequestEvent) {
  const nextKey = getNextKey(event.request.url);
  const news = await findNews(nextKey);
  return {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=60',
    },
    body: news,
  };
}

function getNextKey(url: string): NextKey | undefined {
  const searchParams = new URL(url).searchParams;
  const nextId = searchParams.get('nextId');
  const nextTimestamp = searchParams.get('nextTimestamp');
  if (nextId && nextTimestamp) {
    return { id: nextId, timestamp: new Date(nextTimestamp) };
  }
}
