import type { Story } from './story';

export interface News {
  stories: Array<Story>;
  storyBuckets?: Array<NewsBucket>;
}

export interface NewsBucket {
  name: string;
  minAgeInMin: number;
  maxAgeInMin?: number;
  stories: Array<Story>;
}
