import type { Story } from '$lib/models/story';
import Dexie, { type Table } from 'dexie';
import { BOOKMARKS_STORE_NAME } from '$lib/configs/client';

export default class BookmarksDb extends Dexie {
  stories!: Table<Story, string>;

  constructor() {
    super(BOOKMARKS_STORE_NAME);
    this.version(1).stores({ stories: 'id, timestamp, isBookmarked, isViewed' });
  }
}
