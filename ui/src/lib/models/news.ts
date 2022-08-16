import type { Story } from './story';

export interface News {
  stories: Array<Story>;
  storyBuckets?: Array<NewsBucket>;
  search?: string;
  prevKey?: PageKey | null;
  nextKey?: PageKey | null;
}

export interface NewsBucket {
  name: string;
  minAgeInMin: number;
  maxAgeInMin?: number;
  stories: Array<Story>;
}

export interface PageKey {
  id: string;
  timestamp: string;
  type: 'prev' | 'next';
}

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
