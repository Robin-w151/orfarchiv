import { findNews } from '../../lib/db/news';
import type { RequestEvent } from '@sveltejs/kit';
import type { PageKey } from '../../lib/models/news';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get(event: RequestEvent) {
  const url = event.request.url;
  const prevKey = getPrevKey(url);
  const nextKey = getNextKey(url);
  const news = await findNews(nextKey ?? prevKey);
  return {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=60',
    },
    body: news,
  };
}

function getPrevKey(url: string): PageKey | undefined {
  const searchParams = new URL(url).searchParams;
  const prevId = searchParams.get('prevId');
  const prevTimestamp = searchParams.get('prevTimestamp');
  if (prevId && prevTimestamp) {
    return { id: prevId, timestamp: new Date(prevTimestamp), type: 'prev' };
  }
}

function getNextKey(url: string): PageKey | undefined {
  const searchParams = new URL(url).searchParams;
  const nextId = searchParams.get('nextId');
  const nextTimestamp = searchParams.get('nextTimestamp');
  if (nextId && nextTimestamp) {
    return { id: nextId, timestamp: new Date(nextTimestamp), type: 'next' };
  }
}
