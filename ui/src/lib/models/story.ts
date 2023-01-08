export interface Story {
  id: string;
  title: string;
  category: string;
  url: string;
  timestamp: string;
  source: string;
  content?: StoryContent;
  isBookmarked?: number;
  isViewed?: number;
}

export interface StoryContent {
  content: string;
  source?: StorySource;
}

export interface StorySource {
  name: string;
  url: string;
}
