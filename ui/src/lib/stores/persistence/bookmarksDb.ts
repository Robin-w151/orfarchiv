import type { Story } from '$lib/models/story';
import Dexie, { type Table, type Transaction } from 'dexie';

export default class BookmarksDb extends Dexie {
  stories!: Table<Story, string>;

  constructor() {
    super('bookmarks');
    this.version(1).stores({ stories: 'id,timestamp' });
    this.version(2)
      .stores({
        stories: 'id,timestamp',
      })
      .upgrade((tx: Transaction) => {
        console.log('Upgraded bookmarks table to version 2.');
        tx.table('stories')
          .toCollection()
          .modify((story) => {
            story.isBookmarked = true;
          });
      });
  }
}
