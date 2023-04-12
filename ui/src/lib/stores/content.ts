import type { StoryContent } from '$lib/models/story';
import { writable, type Readable } from 'svelte/store';
import { LRUCache } from 'lru-cache';
import { browser } from '$app/environment';

export interface ContentStoreState {
  cachedStoryContent: number;
}

export interface ContentStore extends Readable<ContentStoreState>, Partial<ContentStoreState> {
  getContent: (storyId: string) => StoryContent;
  setContent: (storyId: string, content: StoryContent) => void;
}

const cache: LRUCache<string, StoryContent> = new LRUCache({ max: 256 });
const initialState = { cachedStoryContent: 0 };
const { subscribe, update } = writable<ContentStoreState>(initialState);

function getContent(storyId: string): StoryContent | undefined {
  if (!storyId) {
    return;
  }

  return cache.get(storyId);
}

function setContent(storyId: string, content: StoryContent): void {
  cache.set(storyId, content);

  update((...content) => ({ ...content, cachedStoryContent: cache.size }));
}

if (browser) {
  console.log('content-store-initialized');
}

export default { subscribe, getContent, setContent } as ContentStore;
