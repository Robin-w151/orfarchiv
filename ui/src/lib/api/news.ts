import type { News } from '$lib/models/news';
import type { PageKey } from '$lib/models/pageKey';
import type { SearchRequestParameters } from '$lib/models/searchRequest';
import { toSearchParams } from '$lib/utils/searchRequest';
import type { StoryContent } from '$lib/models/story';
import { API_NEWS_CONTENT_URL, API_NEWS_SEARCH_URL } from '$lib/configs/client';

let abortController: AbortController | null = null;

export async function searchNews(searchRequestParameters: SearchRequestParameters, pageKey?: PageKey): Promise<News> {
  const searchRequest = { searchRequestParameters, pageKey };
  const searchParams = toSearchParams(searchRequest);

  abortController?.abort();
  abortController = new AbortController();

  const response = await fetch(API_NEWS_SEARCH_URL(searchParams), {
    signal: abortController.signal,
  });
  abortController = null;

  if (!response.ok) {
    throw new Error('Failed to search news!');
  }

  return await response.json();
}

export async function fetchContent(url: string, fetchReadMoreContent = false): Promise<StoryContent> {
  const searchParams = new URLSearchParams();
  searchParams.append('url', url);
  if (fetchReadMoreContent) {
    searchParams.append('fetchReadMoreContent', 'true');
  }
  const response = await fetch(API_NEWS_CONTENT_URL(searchParams.toString()));
  if (!response.ok) {
    throw new Error('Failed to load story content!');
  }
  return response.json();
}
