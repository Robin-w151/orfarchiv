import { type Readable, writable } from 'svelte/store';
import type { News } from '$lib/models/news';
import type { Story } from '$lib/models/story';
import { DateTime } from 'luxon';
import type { NewsBucket } from '$lib/models/news';

export interface NewsStore extends Partial<News> {
  subscribe: Readable<News>['subscribe'];
  setNews: (_: News) => void;
  addNews: (_: News, append?: boolean) => void;
  setIsLoading: (_: boolean) => void;
}

const initialState = { stories: [], isLoading: true };
const { subscribe, update } = writable<News>(initialState);

function setNews(news: News): void {
  if (!news) {
    return;
  }
  const { stories, prevKey, nextKey } = news;
  update((oldNews) => {
    const storyBuckets = createStoryBucketsAndFilter({ ...oldNews, stories });
    return { ...oldNews, stories, storyBuckets, prevKey, nextKey };
  });
}

function addNews(news: News, append = true): void {
  if (!news) {
    return;
  }
  const { stories, prevKey, nextKey } = news;
  update((oldNews) => {
    const newStories = append ? (oldNews.stories ?? []).concat(stories) : (stories ?? []).concat(oldNews.stories);
    const storyBuckets = createStoryBucketsAndFilter({ ...oldNews, stories: newStories });
    const newNews = { ...oldNews, stories: newStories, storyBuckets };
    if (append) {
      newNews.nextKey = nextKey;
    } else if (prevKey) {
      newNews.prevKey = prevKey;
    }
    return newNews;
  });
}

function setIsLoading(isLoading: boolean): void {
  update((oldNews) => ({ ...oldNews, isLoading }));
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

  stories.forEach((story) => {
    for (const bucket of buckets) {
      if (isInBucket(bucket, story)) {
        bucket.stories.push(story);
        break;
      }
    }
  });
  return buckets;
}

export default { subscribe, setNews, addNews, setIsLoading } as NewsStore;
