import { browser } from '$app/environment';
import type { Bookmarks } from '$lib/models/bookmarks';
import type { Story } from '$lib/models/story';
import { liveQuery } from 'dexie';
import { writable, type Readable } from 'svelte/store';
import BookmarksDb from './persistence/bookmarksDb';

export interface BookmarksStore extends Readable<Bookmarks>, Partial<Bookmarks> {
  addStory: (story: Story) => void;
  removeStory: (story: Story) => void;
  setTextFilter: (textFilter: string) => void;
}

let db: BookmarksDb | null = null;
const initialState = { stories: [], filteredStories: [], textFilter: '' };
const store = writable<Bookmarks>(initialState);
const { subscribe, update } = store;

if (browser) {
  db = new BookmarksDb();
  liveQuery(() => (db ? db.stories.toCollection().reverse().sortBy('timestamp') : [])).subscribe((stories) => {
    update((bookmarks) => ({ ...bookmarks, stories, filteredStories: filterStories(bookmarks.textFilter, stories) }));
  });
}

function addStory(story: Story): void {
  db?.stories.add({ ...story, isBookmarked: true }, story.id);
}

function removeStory(story: Story): void {
  db?.stories.delete(story.id);
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

export default { subscribe, addStory, removeStory, setTextFilter } as BookmarksStore;
