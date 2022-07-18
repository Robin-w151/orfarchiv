import type { News } from '../models/news';

export async function getNews(): Promise<News> {
  const response = await fetch('/news');
  if (!response.ok) {
    throw new Error('Failed to fetch news!');
  }
  return await response.json();
}
