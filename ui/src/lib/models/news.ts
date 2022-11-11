import type { PageKey } from './pageKey';
import type { Story } from './story';

export interface News {
  stories: Array<Story>;
  isLoading: boolean;
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
