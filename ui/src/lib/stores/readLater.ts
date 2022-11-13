import type { ReadLater } from '$lib/models/readLater';
import type { Story } from '$lib/models/story';
import { writable, type Readable } from 'svelte/store';
import { openDB, type IDBPDatabase } from 'idb';
import { browser } from '$app/environment';

export interface ReadLaterStore extends Readable<ReadLater>, Partial<ReadLater> {
  addStory: (story: Story) => void;
}

let db: IDBPDatabase | null = null;
initDB();

const initialState = { stories: [] };
const { subscribe, update } = writable<ReadLater>(initialState);

function addStory(story: Story) {
  update((readLater) => ({ ...readLater, stories: insertIfAbsent(story, readLater.stories) }));
}

function insertIfAbsent(story: Story, stories: Array<Story>) {
  const isAbsent = !stories.find((s) => s.id === story.id);
  return isAbsent ? [story, ...stories] : stories;
}

async function initDB() {
  if (browser) {
    db = await openDB('orfarchiv', 1);
  }
}

export default { subscribe, addStory } as ReadLaterStore;
