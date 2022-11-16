import type { ReadLater } from '$lib/models/readLater';
import type { Story } from '$lib/models/story';
import { DateTime } from 'luxon';
import { writable } from 'svelte-local-storage-store';
import type { Readable } from 'svelte/store';

export interface ReadLaterStore extends Readable<ReadLater>, Partial<ReadLater> {
  addStory: (story: Story) => void;
}

const initialState = { stories: [] };
const { subscribe, update } = writable<ReadLater>('readLater', initialState);

function addStory(story: Story): void {
  update((readLater) => ({ ...readLater, stories: insertIfAbsent(story, readLater.stories) }));
}

function insertIfAbsent(story: Story, stories: Array<Story>): Array<Story> {
  const isAbsent = !stories.find((s) => s.id === story.id);

  let newStories = stories;
  if (isAbsent) {
    newStories = [story, ...stories];
  }

  return newStories.sort(compareStories);
}

function compareStories(s1: Story, s2: Story): number {
  return DateTime.fromISO(s2.timestamp).valueOf() - DateTime.fromISO(s1.timestamp).valueOf();
}

export default { subscribe, addStory } as ReadLaterStore;
