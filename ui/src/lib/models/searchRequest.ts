import type { PageKey } from '$lib/models/pageKey';
import type { DateTime } from 'luxon';

export interface DateFilter {
  from?: DateTime;
  to?: DateTime;
}

export interface SearchFilter {
  textFilter?: string;
  dateFilter?: DateFilter;
}

export interface SearchRequestParameters extends SearchFilter {
  sources?: Array<string>;
}

export interface SearchRequest {
  searchRequestParameters: SearchRequestParameters;
  pageKey?: PageKey;
}
