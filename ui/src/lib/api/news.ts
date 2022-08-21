import type { News, PageKey } from '$lib/models/news';
import type { SearchRequestParameters } from '$lib/models/searchRequest';
import { toSearchParams } from '$lib/utils/searchRequest';
import news from '$lib/stores/news';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let abortController: AbortController | null = null;

export async function searchNews(
  fetch: FetchFn,
  searchRequestParameters: SearchRequestParameters,
  pageKey?: PageKey,
): Promise<News> {
  news.setIsLoading(true);

  const searchRequest = { searchRequestParameters, pageKey };
  const searchParams = toSearchParams(searchRequest);

  abortController?.abort();
  abortController = new AbortController();

  try {
    const response = await fetch(`/news/search?${searchParams}`, {
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error('Failed to search news!');
    }

    const data = await response.json();
    news.setIsLoading(false);
    return data;
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      news.setIsLoading(false);
    }
    throw error;
  }
}
