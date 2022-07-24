import { get, type Readable, writable } from 'svelte/store';
import type { News } from '../models/news';
import type { Story } from '../models/story';
import { DateTime } from 'luxon';
import type { NewsBucket } from '../models/news';
import settings from './settings';

interface NewsStore extends Partial<News> {
  subscribe: Readable<News>['subscribe'];
  setNews: (_: News) => void;
  setSearch: (_: string | undefined) => void;
}

const initialState = { stories: [] };
const { subscribe, update } = writable<News>(initialState);

function setNews(news: News): void {
  if (!news) {
    return;
  }
  const stories = news.stories;
  update((oldNews) => {
    const storyBuckets = createStoryBucketsAndFilter({ ...oldNews, stories });
    return { ...oldNews, stories, storyBuckets };
  });
}

function setSearch(search?: string): void {
  update((oldNews) => {
    const storyBuckets = createStoryBucketsAndFilter({ ...oldNews, search });
    return { ...oldNews, storyBuckets, search };
  });
}

function createStoryBucketsAndFilter(news: News): Array<NewsBucket> | undefined {
  if (!news) {
    return undefined;
  }
  const stories = news.stories ?? [];

  const now = DateTime.now();
  function isInBucket(bucket: NewsBucket, story: Story) {
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
      name: 'Letzte 7 Tage',
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
    .filter(filterStory.bind(null, news.search?.toLowerCase()))
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

function filterStory(search: string | undefined, story: Story): boolean {
  if (!search) {
    return true;
  }

  const normalizedSource = story.source?.toLowerCase();
  if (normalizedSource?.includes(search)) {
    return true;
  }

  const normalizedCategory = story.category?.toLowerCase();
  if (normalizedCategory?.includes(search)) {
    return true;
  }

  const normalizedTitle = story.title?.toLowerCase();
  return !!normalizedTitle?.includes(search);
}

export default { subscribe, setNews, setSearch } as NewsStore;
