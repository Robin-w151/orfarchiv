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
