import type { Story } from '$lib/models/story';
import Dexie, { type Table } from 'dexie';

export default class BookmarksDb extends Dexie {
  stories!: Table<Story, string>;

  constructor() {
    super('bookmarks');
    this.version(1).stores({ stories: 'id, timestamp, isBookmarked, isViewed' });
  }
}
