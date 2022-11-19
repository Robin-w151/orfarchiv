import { browser } from '$app/environment';
import type { Bookmarks } from '$lib/models/bookmarks';
import type { Story } from '$lib/models/story';
import { liveQuery } from 'dexie';
import { writable, type Readable } from 'svelte/store';
import BookmarksDb from './persistence/bookmarksDb';

export interface BookmarksStore extends Readable<Bookmarks>, Partial<Bookmarks> {
  addStory: (story: Story) => void;
  removeStory: (story: Story) => void;
}

let db: BookmarksDb | null = null;
const initialState = { stories: [] };
const store = writable<Bookmarks>(initialState);
const { subscribe, update } = store;

if (browser) {
  db = new BookmarksDb();
  liveQuery(() => (db ? db.stories.toCollection().reverse().sortBy('timestamp') : [])).subscribe((stories) => {
    update((bookmarks) => ({ ...bookmarks, stories }));
  });
}

function addStory(story: Story): void {
  db?.stories.add({ ...story, isBookmarked: true }, story.id);
}

function removeStory(story: Story): void {
  db?.stories.delete(story.id);
}

export default { subscribe, addStory, removeStory } as BookmarksStore;
