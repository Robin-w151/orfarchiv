import type { Story } from '$lib/models/story';
import { filter, map, Observable, Subject } from 'rxjs';
import { createRxjsStore } from './utils';

export type SelectStoryStore = Observable<string | undefined> & { select: (select: SelectStory) => void };

export interface SelectStory {
  stories: Array<Story>;
  id: string;
  next: boolean;
}

export const refreshNews = createEventStore();

export const loadMoreNews = createEventStore();

export const startSearch = createEventStore();

export const selectStory = createStorySelectStore();

function createEventStore() {
  const { subscribe, set } = createRxjsStore<void>();
  return { subscribe, onUpdate: subscribe, notify: set };
}

function createStorySelectStore() {
  const subject = new Subject<SelectStory>();
  const store = subject.pipe(
    map(selectStory),
    filter((select) => !!select),
  );

  function selectStory({ stories, id, next }: SelectStory): string | undefined {
    const index = stories.findIndex((story) => story.id === id);
    if (next && index > -1 && index < stories.length - 1) {
      return stories[index + 1].id;
    }
    if (!next && index > 0) {
      return stories[index - 1].id;
    }
  }

  (store as SelectStoryStore).select = subject.next.bind(subject);

  return store as SelectStoryStore;
}
