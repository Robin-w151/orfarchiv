import type { News, PageKey } from '$lib/models/news';
import type { SearchRequestParameters } from '$lib/models/searchRequest';
import { toSearchParams } from '$lib/utils/searchRequest';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function searchNews(
  fetch: FetchFn,
  searchRequestParameters: SearchRequestParameters,
  pageKey?: PageKey,
): Promise<News> {
  const searchRequest = { searchRequestParameters, pageKey };
  const searchParams = toSearchParams(searchRequest);

  const response = await fetch(`/news/search?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to search news!');
  }

  return await response.json();
}
