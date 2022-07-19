import { type Readable, writable } from 'svelte/store';
import type { News } from '../models/news';

interface NewsStore extends Partial<News> {
  subscribe: Readable<News>['subscribe'];
  setNews: (_: News) => void;
}

const initialState = { stories: [] };
const { subscribe, set } = writable<News>(initialState);

function setNews(news: News): void {
  set(news);
}

export default { subscribe, setNews } as NewsStore;
