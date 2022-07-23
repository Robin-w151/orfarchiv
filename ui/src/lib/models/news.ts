import type { Story } from './story';

export interface News {
  stories: Array<Story>;
  storyBuckets?: Array<NewsBucket>;
  search?: string;
}

export interface NewsBucket {
  name: string;
  minAgeInMin: number;
  maxAgeInMin?: number;
  stories: Array<Story>;
}
