import type { PageKey } from '$lib/models/news';
import type { DateTime } from 'luxon';

export interface SearchFilter {
  textFilter?: string;
  from?: DateTime;
  to?: DateTime;
}

export interface SearchRequestParameters extends SearchFilter {
  sources?: Array<string>;
}

export interface SearchRequest {
  searchRequestParameters: SearchRequestParameters;
  pageKey?: PageKey;
}
