import type { ReadLater } from '$lib/models/readLater';
import type { Story } from '$lib/models/story';
import { writable, type Readable } from 'svelte/store';
import ReadLaterDB from './persistence/readLaterDB';

export interface ReadLaterStore extends Readable<ReadLater>, Partial<ReadLater> {
  addStory: (story: Story) => void;
}

const db = new ReadLaterDB();
db.init();

const initialState = { stories: [] };
const { subscribe, update } = writable<ReadLater>(initialState);

function addStory(story: Story): void {
  update((readLater) => ({ ...readLater, stories: insertIfAbsent(story, readLater.stories) }));
}

function insertIfAbsent(story: Story, stories: Array<Story>) {
  const isAbsent = !stories.find((s) => s.id === story.id);

  let newStories = stories;
  if (isAbsent) {
    newStories = [story, ...stories];
    db.persistStory(story);
  }

  return newStories;
}

export default { subscribe, addStory } as ReadLaterStore;
