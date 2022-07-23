import { get, type Readable, writable } from 'svelte/store';
import type { News } from '../models/news';
import type { Story as IStory } from '../models/story';
import { DateTime } from 'luxon';
import type { NewsBucket } from '../models/news';
import settings from './settings';

interface NewsStore extends Partial<News> {
  subscribe: Readable<News>['subscribe'];
  setNews: (_: News) => void;
}

const initialState = { stories: [] };
const { subscribe, set } = writable<News>(initialState);

function setNews(news: News): void {
  const storyBuckets = news ? createStoryBuckets(news.stories ?? []) : undefined;
  set({ ...news, storyBuckets });
}

function createStoryBuckets(stories: Array<IStory>): Array<NewsBucket> {
  const now = DateTime.now();
  function isInBucket(bucket: NewsBucket, story: IStory) {
    const timestamp = DateTime.fromISO(story.timestamp);
    const ageInMin = now.diff(timestamp).as('minutes');
    const { minAgeInMin, maxAgeInMin } = bucket;
    return minAgeInMin <= ageInMin && (!maxAgeInMin || maxAgeInMin > ageInMin);
  }

  const buckets: Array<NewsBucket> = [
    {
      name: 'Aktuell',
      minAgeInMin: 0,
      maxAgeInMin: 120,
      stories: [],
    },
    {
      name: 'Letzte 24h',
      minAgeInMin: 120,
      maxAgeInMin: 1440,
      stories: [],
    },
    {
      name: 'Letzte 48h',
      minAgeInMin: 1440,
      maxAgeInMin: 2880,
      stories: [],
    },
    {
      name: 'Vor 7 Tagen',
      minAgeInMin: 2880,
      maxAgeInMin: 10080,
      stories: [],
    },
    {
      name: 'Archiv',
      minAgeInMin: 10080,
      stories: [],
    },
  ];
  const enabledSources = get(settings).sources;

  stories
    .filter((story) => !enabledSources || enabledSources.includes(story.source))
    .forEach((story) => {
      for (const bucket of buckets) {
        if (isInBucket(bucket, story)) {
          bucket.stories.push(story);
          break;
        }
      }
    });
  return buckets;
}

export default { subscribe, setNews } as NewsStore;
