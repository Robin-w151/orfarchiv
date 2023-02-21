export interface Story {
  id: string;
  title: string;
  category: string;
  url: string;
  timestamp: string;
  source: string;
  isBookmarked?: number;
  isViewed?: number;
}

export interface StoryContent {
  content: string;
  id?: string;
  source?: StorySource;
}

export interface StorySource {
  name: string;
  url: string;
}
