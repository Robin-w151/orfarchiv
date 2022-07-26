import type { Story } from './story';

export interface News {
  stories: Array<Story>;
  storyBuckets?: Array<NewsBucket>;
  search?: string;
  nextKey?: NextKey | null;
}

export interface NewsBucket {
  name: string;
  minAgeInMin: number;
  maxAgeInMin?: number;
  stories: Array<Story>;
}

export interface NextKey {
  id: string;
  timestamp: any;
}
