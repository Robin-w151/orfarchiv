import { get } from 'svelte/store';
import news from './news';
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

  function nextStory(storyId: string): void {
    const stories = get(news).stories;
    const index = stories.findIndex((story) => story.id === storyId);
    if (index > -1 && index < stories.length - 1) {
      next(stories[index + 1].id);
    }
  }

  function prevStory(storyId: string): void {
    const stories = get(news).stories;
    const index = stories.findIndex((story) => story.id === storyId);
    if (index > 0) {
      next(stories[index - 1].id);
    }
  }

  return { subscribe, nextStory, prevStory };
}
