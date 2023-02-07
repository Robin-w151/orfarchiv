import type { StoryContent } from '$lib/models/story';

export interface SetContent {
  setContent: (id: string, content: StoryContent) => void;
}
