import type { Story } from '$lib/models/story';
import { createRxjsStore } from './utils';

export const refreshNews = createEventStore();

export const loadMoreNews = createEventStore();

export const startSearch = createEventStore();

export const selectStory = createStorySelectStore();

function createEventStore() {
  const { subscribe, next } = createRxjsStore<void>();
  return { subscribe, onUpdate: subscribe, notify: next };
}

function createStorySelectStore() {
  const { subscribe, next } = createRxjsStore<string>();

  function select(stories: Array<Story>, storyId: string, next: boolean) {
    if (next) {
      nextStory(stories, storyId);
    } else {
      prevStory(stories, storyId);
    }
  }

  function nextStory(stories: Array<Story>, storyId: string): void {
    const index = stories.findIndex((story) => story.id === storyId);
    if (index > -1 && index < stories.length - 1) {
      next(stories[index + 1].id);
    }
  }

  function prevStory(stories: Array<Story>, storyId: string): void {
    const index = stories.findIndex((story) => story.id === storyId);
    if (index > 0) {
      next(stories[index - 1].id);
    }
  }

  return { subscribe, select };
}
