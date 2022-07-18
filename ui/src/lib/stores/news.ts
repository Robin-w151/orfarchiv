import { writable } from 'svelte/store';
import type { Readable } from 'svelte/store';
import type { News } from '../models/news';

const initialState = { stories: [] };

const { subscribe, set } = writable<News>(initialState);

function setNews(news: News): void {
  set(news);
}

type NewsStore = Readable<News> & Partial<News> & { setNews: (_: News) => void };
const newsStore: NewsStore = { subscribe, setNews };

export default newsStore;
