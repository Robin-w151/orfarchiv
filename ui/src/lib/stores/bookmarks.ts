import { browser } from '$app/environment';
import type { Bookmarks } from '$lib/models/bookmarks';
import type { Story } from '$lib/models/story';
import Dexie, { liveQuery, type Table } from 'dexie';
import { writable, type Readable } from 'svelte/store';

export interface BookmarksStore extends Readable<Bookmarks>, Partial<Bookmarks> {
  addStory: (story: Story) => void;
  removeStory: (story: Story) => void;
  isBookmarked: (story: Story) => Promise<boolean>;
}

class BookmarksDb extends Dexie {
  stories!: Table<Story>;

  constructor() {
    super('bookmarks');
    this.version(1).stores({
      stories: 'id,timestamp',
    });
  }
}

let db: BookmarksDb | null = null;
const initialState = { stories: [] };
const { subscribe, update } = writable<Bookmarks>(initialState);

if (browser) {
  db = new BookmarksDb();
  liveQuery(() => (db ? db.stories.toCollection().reverse().sortBy('timestamp') : [])).subscribe((stories) =>
    update((bookmarks) => ({ ...bookmarks, stories })),
  );
}

function addStory(story: Story): void {
  db?.stories.add(story, story.id);
}

function removeStory(story: Story): void {
  db?.stories.delete(story.id);
}

async function isBookmarked(story: Story): Promise<boolean> {
  return !!(await db?.stories.get(story.id)) ?? false;
}

export default { subscribe, addStory, removeStory, isBookmarked } as BookmarksStore;
