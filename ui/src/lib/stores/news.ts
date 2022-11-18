import { type Readable, writable } from 'svelte/store';
import type { News, NewsBucket } from '$lib/models/news';
import type { Story } from '$lib/models/story';
import { DateTime } from 'luxon';

export interface NewsStore extends Partial<News> {
  subscribe: Readable<News>['subscribe'];
  setNews: (news: News, newNews?: News) => void;
  addNews: (news: News, append?: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
}

const initialState = { stories: [], isLoading: true };
const { subscribe, update } = writable<News>(initialState);

function setNews(news: News, newNews?: News): void {
  if (!news && !newNews) {
    return;
  }

  const { stories, prevKey, nextKey } = news;
  const { stories: newStories, prevKey: newPrevKey } = newNews ?? {};
  const combinedStories = combineStories(stories, newStories);

  update((oldNews) => {
    const storyBuckets = createStoryBuckets({ ...oldNews, stories: combinedStories });
    return { ...oldNews, stories: combinedStories, storyBuckets, prevKey: newPrevKey ?? prevKey, nextKey };
  });
}

function addNews(news: News, append = true): void {
  if (!news) {
    return;
  }
  const { stories, prevKey, nextKey } = news;
  update((oldNews) => {
    const newStories = combineStories(oldNews.stories, stories, append);
    const storyBuckets = createStoryBuckets({ ...oldNews, stories: newStories });
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

function createStoryBuckets(news: News): Array<NewsBucket> | undefined {
  if (!news) {
    return undefined;
  }
  const stories = news.stories ?? [];

  const now = DateTime.now();
  function isInBucket(bucket: NewsBucket, story: Story) {
    const timestamp = DateTime.fromISO(story.timestamp);
    const ageInMin = now.diff(timestamp).as('minutes');
    const { minAgeInMin, maxAgeInMin } = bucket;
    return (!minAgeInMin || minAgeInMin <= ageInMin) && (!maxAgeInMin || maxAgeInMin > ageInMin);
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

function combineStories(oldStories: Array<Story>, newStories: Array<Story> = [], append = false): Array<Story> {
  return append ? (oldStories ?? []).concat(newStories) : (newStories ?? []).concat(oldStories);
}

export default { subscribe, setNews, addNews, setIsLoading } as NewsStore;
