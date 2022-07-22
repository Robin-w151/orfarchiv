import type { News } from '../models/news';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function getNews(fetch: FetchFn): Promise<News> {
  const response = await fetch('/news');
  if (!response.ok) {
    throw new Error('Failed to fetch news!');
  }
  return await response.json();
}
