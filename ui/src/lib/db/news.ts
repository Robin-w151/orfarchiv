import { Collection, MongoClient, type WithId } from 'mongodb';
import type { News } from '../models/news';
import type { Story } from '../models/story';
import { DateTime } from 'luxon';

export async function findNews(maxAgeInMin: number): Promise<News> {
  const earliestTimestamp = DateTime.now().minus({ minutes: maxAgeInMin }).toISO();
  console.log('Earliest timestamp', earliestTimestamp);
  return withOrfArchivDb(async (newsCollection) => {
    const stories = await newsCollection
      .find({ timestamp: { $gte: new Date(earliestTimestamp) } })
      .sort({ timestamp: -1 })
      .toArray();
    return { stories: stories.map(mapToStory) };
  });
}

async function withOrfArchivDb(handler: (newsCollection: Collection) => Promise<News>) {
  const url = process.env.ORFARCHIV_DB_URL?.trim() || 'mongodb://localhost';
  let client;
  try {
    client = await MongoClient.connect(url);
    const db = client.db('orfarchiv');
    const newsCollection = db.collection('news');
    return await handler(newsCollection);
  } catch (error: any) {
    throw new Error(`DB error. Cause ${error.message}`);
  } finally {
    await client?.close();
  }
}

function mapToStory(entry: WithId<any>): Story {
  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    url: entry.url,
    timestamp: entry.timestamp.toISOString(),
  };
}
