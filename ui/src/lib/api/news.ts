import type { News, NewsUpdates } from '$lib/models/news';
import type { PageKey } from '$lib/models/pageKey';
import type { SearchRequestParameters } from '$lib/models/searchRequest';
import { toSearchParams } from '$lib/utils/searchRequest';
import type { StoryContent } from '$lib/models/story';
import { API_NEWS_CONTENT_URL, API_NEWS_SEARCH_UPDATES_URL, API_NEWS_SEARCH_URL } from '$lib/configs/client';

let abortController: AbortController | null = null;

export async function searchNews(searchRequestParameters: SearchRequestParameters, pageKey?: PageKey): Promise<News> {
  console.group('request-search-news');
  console.log('search-request-parameters', searchRequestParameters);
  console.log('page-key', pageKey);
  console.groupEnd();

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

export async function checkNewsUpdates(
  searchRequestParameters: SearchRequestParameters,
  pageKey: PageKey,
): Promise<NewsUpdates> {
  console.group('request-check-news-updates');
  console.log('search-request-parameters', searchRequestParameters);
  console.log('page-key', pageKey);
  console.groupEnd();

  const searchRequest = { searchRequestParameters, pageKey };
  const searchParams = toSearchParams(searchRequest);

  const response = await fetch(API_NEWS_SEARCH_UPDATES_URL(searchParams));
  if (!response.ok) {
    throw new Error('Failed to check if news updates are available!');
  }

  return await response.json();
}

export async function fetchContent(url: string, fetchReadMoreContent = false): Promise<StoryContent> {
  console.group('request-content');
  console.log('url', url);
  console.log('fetch-read-more-content', fetchReadMoreContent);
  console.groupEnd();

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
