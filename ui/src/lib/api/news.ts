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

  return await response.json();
}

export async function fetchContent(url: string, fetchReadMoreContent = false): Promise<string> {
  const response = await fetch(
    `/api/news/content?url=${encodeURIComponent(url)}${fetchReadMoreContent ? '&fetchReadMoreContent=true' : ''}`,
  );
  if (!response.ok) {
    throw new Error('Failed to load story content!');
  }
  return response.text();
}
