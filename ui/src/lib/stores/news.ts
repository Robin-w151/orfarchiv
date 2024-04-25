import { browser } from '$app/environment';
import type { Bookmarks } from '$lib/models/bookmarks';
import type { News, NewsBucket } from '$lib/models/news';
import type { Story } from '$lib/models/story';
import { DateTime } from 'luxon';
import { derived, get, writable, type Readable } from 'svelte/store';
import bookmarks from './bookmarks';
import settings from './settings';
import { fetchContent } from '$lib/api/news';

export interface NewsStore extends Readable<News>, Partial<News> {
  setNews: (news: News, newNews?: News) => void;
  addNews: (news: News, append?: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  taskWithLoading: (handler: () => void | Promise<void>) => Promise<void>;
  cacheForOfflineUse: () => Promise<void>;
}

const initialState = { stories: [], isLoading: true };
const news = writable<News>(initialState);
const { update } = news;

function setNews(news: News, newNews?: News): void {
  if (!news && !newNews) {
    return;
  }

  const { stories, prevKey, nextKey } = news;
  const { stories: newStories, prevKey: newPrevKey } = newNews ?? {};
  const combinedStories = combineStories(stories, newStories);

  update((oldNews) => {
    return { ...oldNews, stories: combinedStories, prevKey: newPrevKey ?? prevKey, nextKey };
  });
}

function addNews(news: News, append = true): void {
  if (!news) {
    return;
  }
  const { stories, prevKey, nextKey } = news;

  update((oldNews) => {
    const newStories = combineStories(oldNews.stories, stories, append);
    const newNews = { ...oldNews, stories: newStories };
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

async function taskWithLoading(handler: () => void | Promise<void>): Promise<void> {
  try {
    setIsLoading(true);
    await handler();
    setIsLoading(false);
  } catch (error) {
    const { name } = error as Error;
    if (name === 'AbortError') {
      return;
    }
    setIsLoading(false);
    console.warn(error);
  }
}

async function cacheForOfflineUse(): Promise<void> {
  const fetchReadMoreContentPreference = get(settings).fetchReadMoreContent;
  const stories = get(news).stories.slice(0, 100);
  await Promise.allSettled(
    stories.map((story) => {
      const fetchReadMoreContent = fetchReadMoreContentPreference && story.source === 'news';
      return fetchContent(story.url, fetchReadMoreContent);
    }),
  );
}

function createStoryBuckets(stories: Array<Story>): Array<NewsBucket> | undefined {
  if (!stories) {
    return undefined;
  }

  const buckets: Map<string, NewsBucket> = new Map();
  function addToBucket(buckets: Map<string, NewsBucket>, story: Story): void {
    const timestamp = DateTime.fromISO(story.timestamp);
    const date = timestamp.toISODate() ?? '1970-01-01T00:00:00Z';
    if (buckets.has(date)) {
      buckets.get(date)?.stories.push(story);
    } else {
      const name = timestamp.setLocale('de-AT').toFormat('cccc, dd.MM.yyyy');
      const bucket = {
        name,
        date,
        stories: [story],
      };
      buckets.set(date, bucket);
    }
  }

  function compareBuckets(b1: NewsBucket, b2: NewsBucket): number {
    if (!b1.date || !b2.date) {
      return 0;
    }

    return b2.date.localeCompare(b1.date);
  }

  stories.forEach((story) => addToBucket(buckets, story));
  return Array.from(buckets.values()).sort(compareBuckets);
}

function combineStories(oldStories: Array<Story>, newStories: Array<Story> = [], append = false): Array<Story> {
  return append ? (oldStories ?? []).concat(newStories) : (newStories ?? []).concat(oldStories);
}

function setBookmarkStatus(stories: Array<Story>, bookmarkStories: Array<Story>): Array<Story> {
  const bookmarkIds = bookmarkStories.map((b) => b.id);
  return stories.map((story) => ({ ...story, isBookmarked: +bookmarkIds.includes(story.id) }));
}

let oldStories: Array<Story>;
let oldBookmarkStories: Array<Story>;
let cachedStories: Array<Story>;
let cachedStoryBuckets: Array<NewsBucket> | undefined;

function combineNewsAndBookmarks([news, bookmarks]: [News, Bookmarks]): News {
  const stories = news.stories;
  const bookmarkStories = bookmarks.stories;

  let newStories = cachedStories;
  let newStoryBuckets = cachedStoryBuckets;

  if (oldStories !== stories || oldBookmarkStories !== bookmarkStories) {
    oldStories = stories;
    oldBookmarkStories = bookmarkStories;

    newStories = setBookmarkStatus(stories, bookmarkStories);
    newStoryBuckets = createStoryBuckets(newStories);

    cachedStories = newStories;
    cachedStoryBuckets = newStoryBuckets;
  }

  return { ...news, stories: newStories, storyBuckets: newStoryBuckets };
}

const extendedStore = derived([news, bookmarks], combineNewsAndBookmarks);
const { subscribe } = extendedStore;

if (browser) {
  console.log('news-store-initialized');
}

export default {
  subscribe,
  setNews,
  addNews,
  setIsLoading,
  taskWithLoading,
  cacheForOfflineUse,
} as NewsStore;
