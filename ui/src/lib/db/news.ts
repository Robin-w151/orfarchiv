import { Collection, MongoClient, type Sort, type WithId } from 'mongodb';
import type { News, NextKey } from '../models/news';
import type { Story } from '../models/story';

interface PaginationQuery {
  paginatedQuery: any;
  sort: Sort;
  nextKeyFn: (stories: Array<Story>) => NextKey | null;
}

export async function findNews(nextKey?: NextKey): Promise<News> {
  const query = {};
  return withOrfArchivDb(async (newsCollection) => {
    const { paginatedQuery, sort, nextKeyFn } = generatePaginationQuery(query, nextKey);
    const stories = (await newsCollection
      .find(paginatedQuery)
      .limit(250)
      .sort(sort)
      .toArray()) as unknown as Array<Story>;
    const newNextKey = nextKeyFn(stories);
    return { stories: stories.map(mapToStory), nextKey: newNextKey };
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

function generatePaginationQuery(query: any, nextKey?: NextKey): PaginationQuery {
  const sort: Sort = { timestamp: -1, id: -1 };

  function nextKeyFn(stories: Array<Story>): NextKey | null {
    if (stories.length === 0) {
      return null;
    }

    const story = stories[stories.length - 1];
    return { id: story.id, timestamp: story.timestamp };
  }

  if (!nextKey) {
    return { paginatedQuery: query, sort, nextKeyFn };
  }

  let paginatedQuery = query;

  const sortField = 'timestamp';
  const sortOperator = '$lt';

  const paginationQuery = [
    { [sortField]: { [sortOperator]: nextKey[sortField] } },
    {
      $and: [{ [sortField]: nextKey[sortField] }, { id: { [sortOperator]: nextKey.id } }],
    },
  ];

  if (paginatedQuery.$or == null) {
    paginatedQuery.$or = paginationQuery;
  } else {
    paginatedQuery = { $and: [query, { $or: paginationQuery }] };
  }

  return { paginatedQuery, sort, nextKeyFn };
}

function mapToStory(entry: WithId<any>): Story {
  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    url: entry.url,
    timestamp: entry.timestamp.toISOString(),
    source: entry.source,
  };
}
