import { type Readable, writable } from 'svelte/store';
import type { News } from '../models/news';
import type { Story } from '../models/story';

interface NewsStore {
  subscribe: Readable<News>['subscribe'];
  setNews: (_: News) => void;
  stories?: Array<Story>;
}

const initialState = { stories: [] };

const { subscribe, set } = writable<News>(initialState);

function setNews(news: News): void {
  set(news);
}

const newsStore: NewsStore = { subscribe, setNews };

export default newsStore;
