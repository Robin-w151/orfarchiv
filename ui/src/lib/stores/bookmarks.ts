import { browser } from '$app/environment';
import type { Bookmarks } from '$lib/models/bookmarks';
import type { Story } from '$lib/models/story';
import { liveQuery } from 'dexie';
import { writable, type Readable } from 'svelte/store';
import BookmarksDb from './persistence/bookmarksDb';
import type { StoryContent } from '$lib/models/story';

export interface BookmarksStore extends Readable<Bookmarks>, Partial<Bookmarks> {
  add: (story: Story) => void;
  remove: (story: Story) => void;
  removeAll: () => void;
  removeAllViewed: () => void;
  setContent: (storyId: string, content: StoryContent) => void;
  setIsViewed: (story: Story) => void;
  setTextFilter: (textFilter: string) => void;
}

let db: BookmarksDb | null = null;
const initialState = { stories: [], filteredStories: [], textFilter: '', isLoading: true };
const store = writable<Bookmarks>(initialState);
const { subscribe, update } = store;

if (browser) {
  db = new BookmarksDb();
  liveQuery(() => (db ? db.stories.toCollection().reverse().sortBy('timestamp') : [])).subscribe((stories) => {
    update((bookmarks) => {
      const mergedStories = mergeStoryContent(bookmarks.stories, stories);
      return {
        ...bookmarks,
        stories: mergedStories,
        filteredStories: filterStories(bookmarks.textFilter, mergedStories),
        isLoading: false,
      };
    });
  });
}

function add(story: Story): void {
  db?.stories.add({ ...story, isBookmarked: 1 }, story.id);
}

function remove(story: Story): void {
  db?.stories.delete(story.id);
}

function removeAll(): void {
  db?.stories.toCollection().delete();
}

function removeAllViewed(): void {
  db?.stories.where('isViewed').equals(1).delete();
}

function setContent(storyId: string, content: StoryContent): void {
  update((bookmarks) => {
    const index = bookmarks.stories.findIndex((story) => story.id === storyId);
    if (index === -1) {
      return bookmarks;
    }

    const story = bookmarks.stories[index];
    const stories = [...bookmarks.stories];
    stories[index] = { ...story, content };

    return { ...bookmarks, stories, filteredStories: filterStories(bookmarks.textFilter, stories) };
  });
}

function setIsViewed(story: Story): void {
  db?.stories
    .where('id')
    .equals(story.id)
    .modify((s) => {
      s.isViewed = 1;
    });
}

function setTextFilter(textFilter: string): void {
  update((bookmarks) => ({ ...bookmarks, textFilter, filteredStories: filterStories(textFilter, bookmarks.stories) }));
}

function filterStories(textFilter: string, stories: Array<Story>): Array<Story> {
  if (!textFilter) {
    return stories;
  }

  const textFilters = textFilter
    ?.split(/\s+/)
    .filter((text) => !!text)
    .map((text) => new RegExp(`${text}`, 'i'));

  const filterStoryWithTextFilters = filterStory.bind(null, textFilters);
  return stories.filter(filterStoryWithTextFilters);
}

function filterStory(textFilters: Array<RegExp>, story: Story): boolean {
  return textFilters.every((textFilter) => {
    const { title, category, source } = story;
    return textFilter.test(title) || textFilter.test(category) || textFilter.test(source);
  });
}

function mergeStoryContent(oldStories: Array<Story>, newStories: Array<Story>): Array<Story> {
  const mergedStories = [...newStories];
  for (let i = 0, j = 0; i < mergedStories.length; i++) {
    const newStory = { ...mergedStories[i] };
    const oldStory = oldStories[j];

    if (newStory.id === oldStory?.id) {
      j++;
      if (oldStory.content) {
        newStory.content = oldStory.content;
        mergedStories[i] = newStory;
      }
    }
  }
  return mergedStories;
}

export default {
  subscribe,
  add,
  remove,
  removeAll,
  removeAllViewed,
  setContent,
  setIsViewed,
  setTextFilter,
} as BookmarksStore;
