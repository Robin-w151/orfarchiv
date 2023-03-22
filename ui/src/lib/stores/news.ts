import type { Bookmarks } from '$lib/models/bookmarks';
import type { News, NewsBucket } from '$lib/models/news';
import type { Story } from '$lib/models/story';
import { DateTime } from 'luxon';
import { derived, writable, type Readable } from 'svelte/store';
import bookmarks from './bookmarks';

export interface NewsStore extends Readable<News>, Partial<News> {
  setNews: (news: News, newNews?: News) => void;
  addNews: (news: News, append?: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
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

function createStoryBuckets(stories: Array<Story>): Array<NewsBucket> | undefined {
  if (!stories) {
    return undefined;
  }

  const buckets: Map<string, NewsBucket> = new Map();
  function addToBucket(buckets: Map<string, NewsBucket>, story: Story): void {
    const timestamp = DateTime.fromISO(story.timestamp);
    const date = timestamp.toISODate();
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

  stories.forEach((story) => addToBucket(buckets, story));
  return Array.from(buckets.values()).sort((b1, b2) => b2.date.localeCompare(b1.date));
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

export default { subscribe, setNews, addNews, setIsLoading } as NewsStore;
