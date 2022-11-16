import type { ReadLater } from '$lib/models/readLater';
import type { Story } from '$lib/models/story';
import { writable, type Readable } from 'svelte/store';
import ReadLaterDB from './persistence/readLaterDB';

export interface ReadLaterStore extends Readable<ReadLater>, Partial<ReadLater> {
  addStory: (story: Story) => void;
}

const db = new ReadLaterDB();

const initialState = { stories: [] };
const { subscribe, update } = writable<ReadLater>(initialState);
init();

async function init(): Promise<void> {
  await db.init();
  const stories = await db.findAll();
  update((readLater) => ({ ...readLater, stories }));
}

function addStory(story: Story): void {
  update((readLater) => ({ ...readLater, stories: insertIfAbsent(story, readLater.stories) }));
}

function insertIfAbsent(story: Story, stories: Array<Story>): void {
  const isAbsent = !stories.find((s) => s.id === story.id);

  let newStories = stories;
  if (isAbsent) {
    newStories = [story, ...stories];
    db.persist(story);
  }

  return newStories;
}

export default { subscribe, addStory } as ReadLaterStore;
