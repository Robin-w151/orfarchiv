import type { PageKey } from '$lib/models/news';

export interface SearchTextFilter {
  textFilter?: string;
}

export interface SearchRequestParameters extends SearchTextFilter {
  sources?: Array<string>;
}

export interface SearchRequest {
  searchRequestParameters: SearchRequestParameters;
  pageKey?: PageKey;
}
