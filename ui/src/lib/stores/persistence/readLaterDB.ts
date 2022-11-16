import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { browser } from '$app/environment';
import type { Story } from '$lib/models/story';

const DB_DATABASE_NAME = 'orfarchiv';
const DB_DATABASE_VERSION = 1;
const DB_STORIES_STORE = 'stories';

interface ReadLaterSchema extends DBSchema {
  stories: {
    key: string;
    value: Story;
  };
}

export default class ReadLaterDB {
  private db: IDBPDatabase<ReadLaterSchema> | null = null;

  public async init(): Promise<void> {
    if (browser) {
      const upgrade = (db: IDBPDatabase<ReadLaterSchema>) => {
        db.createObjectStore(DB_STORIES_STORE);
      };
      this.db = await openDB<ReadLaterSchema>(DB_DATABASE_NAME, DB_DATABASE_VERSION, { upgrade });
    }
  }

  public async persist(story: Story): Promise<void> {
    await this.db?.put(DB_STORIES_STORE, story, story.id);
  }

  public async findAll(): Promise<Array<Story>> {
    return (await this.db?.getAll(DB_STORIES_STORE)) ?? [];
  }
}
