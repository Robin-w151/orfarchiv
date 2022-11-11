import type { ReadLater } from '$lib/models/readLater';
import type { Story } from '$lib/models/story';
import { writable, type Readable } from 'svelte/store';

export interface ReadLaterStore extends Readable<ReadLater>, Partial<ReadLater> {
  addStory: (story: Story) => void;
}

const initialState = { stories: [] };
const { subscribe, update } = writable<ReadLater>(initialState);

function addStory(story: Story) {
  update((readLater) => ({ ...readLater, stories: insertIfAbsent(story, readLater.stories) }));
}

function insertIfAbsent(story: Story, stories: Array<Story>) {
  const isAbsent = !stories.find((s) => s.id === story.id);
  return isAbsent ? [story, ...stories] : stories;
}

export default { subscribe, addStory } as ReadLaterStore;
