import type { News, PageKey, SearchRequestParameters } from '$lib/models/news';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function searchNews(
  fetch: FetchFn,
  searchRequestParameters: SearchRequestParameters,
  pageKey?: PageKey,
): Promise<News> {
  const searchRequest = { searchRequestParameters, pageKey };
  const response = await fetch('/news/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchRequest),
  });
  if (!response.ok) {
    throw new Error('Failed to search news!');
  }
  return await response.json();
}
