import { findNews } from '../../lib/db/news';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get() {
  const news = await findNews(30 * 24 * 60);
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=60',
    },
    body: news,
  };
}
