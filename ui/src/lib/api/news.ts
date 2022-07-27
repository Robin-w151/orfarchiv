import type { News, PageKey } from '../models/news';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function getNews(fetch: FetchFn, pageKey?: PageKey): Promise<News> {
  const searchParams = generateSearchParams(pageKey);
  const response = await fetch(`/news${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch news!');
  }
  return await response.json();
}

function generateSearchParams(pageKey?: PageKey): string {
  const searchParams = new URLSearchParams();
  if (pageKey) {
    searchParams.append(`${pageKey.type}Id`, pageKey.id);
    searchParams.append(`${pageKey.type}Timestamp`, pageKey.timestamp);
  }
  const searchParamsString = searchParams.toString();
  return searchParamsString ? `?${searchParamsString}` : '';
}
