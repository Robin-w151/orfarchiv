import { Collection, Db, MongoClient } from 'mongodb';
import { ORFARCHIV_DB_URL } from '$lib/configs/server';

class OrfArchivDb {
  private client: MongoClient | undefined;
  private db: Db | undefined;

  public async init(): Promise<void> {
    if (!this.isInitialized()) {
      this.client = await MongoClient.connect(ORFARCHIV_DB_URL);
      this.db = this.client.db('orfarchiv');
    }
  }

  public collection(name: string): Collection<Document> {
    if (this.db) {
      return this.db.collection(name);
    } else {
      throw new Error('ORF Archiv DB is not connected!');
    }
  }

  private isInitialized(): boolean {
    return !!this.client && !!this.db;
  }
}

const orfArchivDb = new OrfArchivDb();
export default orfArchivDb;