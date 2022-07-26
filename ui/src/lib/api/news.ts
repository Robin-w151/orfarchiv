import type { News, NextKey } from '../models/news';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function getNews(fetch: FetchFn, nextKey?: NextKey): Promise<News> {
  const searchParams = generateSearchParams(nextKey);
  const response = await fetch(`/news${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch news!');
  }
  return await response.json();
}

function generateSearchParams(nextKey?: NextKey): string {
  const searchParams = new URLSearchParams();
  if (nextKey) {
    searchParams.append('nextId', nextKey.id);
    searchParams.append('nextTimestamp', nextKey.timestamp);
  }
  const searchParamsString = searchParams.toString();
  return searchParamsString ? `?${searchParamsString}` : '';
}
