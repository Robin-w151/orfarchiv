import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { browser } from '$app/environment';
import type { Story } from '$lib/models/story';

const DB_DATABASE_NAME = 'orfarchiv';
const DB_DATABASE_VERSION = 1;
const DB_STORIES_STORE = 'stories';
const DB_STORIES_STORE_INDEX = 'idxTimestamp';

interface ReadLaterSchema extends DBSchema {
  stories: {
    key: string;
    value: Story;
    indexes: {
      [DB_STORIES_STORE_INDEX]: string;
    };
  };
}

export default class ReadLaterDB {
  private db: IDBPDatabase<ReadLaterSchema> | null = null;

  public async init(): Promise<void> {
    if (browser) {
      const upgrade = (db: IDBPDatabase<ReadLaterSchema>) => {
        const storiesStore = db.createObjectStore(DB_STORIES_STORE);
        storiesStore.createIndex(DB_STORIES_STORE_INDEX, 'timestamp');
      };
      this.db = await openDB<ReadLaterSchema>(DB_DATABASE_NAME, DB_DATABASE_VERSION, { upgrade });
    }
  }

  public persistStory(story: Story): void {
    this.db?.put(DB_STORIES_STORE, story, story.id);
  }
}
