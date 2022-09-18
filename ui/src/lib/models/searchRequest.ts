import type { PageKey } from '$lib/models/news';

export interface SearchFilter {
  textFilter?: string;
  from?: string;
  to?: string;
  timezone?: string;
}

export interface SearchRequestParameters extends SearchFilter {
  sources?: Array<string>;
}

export interface SearchRequest {
  searchRequestParameters: SearchRequestParameters;
  pageKey?: PageKey;
}
