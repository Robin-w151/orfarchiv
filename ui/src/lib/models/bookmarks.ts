import type { Story } from './story';

export interface Bookmarks {
  stories: Array<Story>;
  filteredStories: Array<Story>;
  textFilter: string;
  isLoading: boolean;
}
