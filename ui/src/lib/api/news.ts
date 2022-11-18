import type { News } from '$lib/models/news';
import type { PageKey } from '$lib/models/pageKey';
import type { SearchRequestParameters } from '$lib/models/searchRequest';
import { toSearchParams } from '$lib/utils/searchRequest';

let abortController: AbortController | null = null;

export async function searchNews(searchRequestParameters: SearchRequestParameters, pageKey?: PageKey): Promise<News> {
  const searchRequest = { searchRequestParameters, pageKey };
  const searchParams = toSearchParams(searchRequest);

  abortController?.abort();
  abortController = new AbortController();

  const response = await fetch(`/api/news/search?${searchParams}`, {
    signal: abortController.signal,
  });
  abortController = null;

  if (!response.ok) {
    throw new Error('Failed to search news!');
  }

  const data = await response.json();
  return data;
}

export async function fetchContent(url: string): Promise<string> {
  const response = await fetch(`/api/news/content?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error('Failed to load story content!');
  }
  return response.text();
}
