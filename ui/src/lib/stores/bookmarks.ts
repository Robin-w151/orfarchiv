import type { Bookmarks } from '$lib/models/bookmarks';
import type { Story } from '$lib/models/story';
import { DateTime } from 'luxon';
import { writable } from 'svelte-local-storage-store';
import { get, type Readable } from 'svelte/store';

export interface BookmarksStore extends Readable<Bookmarks>, Partial<Bookmarks> {
  addStory: (story: Story) => void;
  removeStory: (story: Story) => void;
  isBookmarked: (story: Story) => boolean;
}

const initialState = { stories: [] };
const store = writable<Bookmarks>('bookmarks', initialState);
const { subscribe, update } = store;

function addStory(story: Story): void {
  update((bookmarks) => ({ ...bookmarks, stories: insertIfAbsent(story, bookmarks.stories) }));
}

function removeStory(story: Story): void {
  update((bookmarks) => ({ ...bookmarks, stories: removeIfPresent(story, bookmarks.stories) }));
}

function insertIfAbsent(story: Story, stories: Array<Story>): Array<Story> {
  const isAbsent = !isStoryContained(story, stories);

  let newStories = stories;
  if (isAbsent) {
    newStories = [story, ...stories];
  }

  return newStories.sort(compareStories);
}

function removeIfPresent(story: Story, stories: Array<Story>): Array<Story> {
  const isPresent = isStoryContained(story, stories);

  let newStories = stories;
  if (isPresent) {
    newStories = stories.filter((s) => s.id !== story.id);
  }

  return newStories;
}

function compareStories(s1: Story, s2: Story): number {
  return DateTime.fromISO(s2.timestamp).valueOf() - DateTime.fromISO(s1.timestamp).valueOf();
}

function isBookmarked(story: Story): boolean {
  return isStoryContained(story, get(store).stories);
}

function isStoryContained(story: Story, stories: Array<Story>): boolean {
  return !!stories.find((s) => s.id === story.id);
}

export default { subscribe, addStory, removeStory, isBookmarked } as BookmarksStore;
