import { Collection, MongoClient, type Sort, type WithId } from 'mongodb';
import type { News, PageKey } from '../models/news';
import type { Story } from '../models/story';

type PageKeyFn = (stories: Array<Story>) => PageKey | null;

interface PaginationQuery {
  paginatedQuery: any;
  sort: Sort;
  prevKeyFn: PageKeyFn;
  nextKeyFn: PageKeyFn;
}

export async function findNews(pageKey?: PageKey): Promise<News> {
  const query = {};
  return withOrfArchivDb(async (newsCollection) => {
    const { paginatedQuery, sort, prevKeyFn, nextKeyFn } = generatePaginationQuery(query, pageKey);
    const stories = (await newsCollection
      .find(paginatedQuery)
      .limit(250)
      .sort(sort)
      .toArray()) as unknown as Array<Story>;
    const newPrevKey = prevKeyFn(stories);
    const newNextKey = nextKeyFn(stories);
    return { stories: stories.map(mapToStory), prevKey: newPrevKey, nextKey: newNextKey };
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

function generatePaginationQuery(query: any, pageKey?: PageKey): PaginationQuery {
  const next = !pageKey || pageKey?.type === 'next';
  const sort: Sort = next ? { timestamp: -1, id: -1 } : { timestamp: 1, id: 1 };

  function prevKeyFn(stories: Array<Story>): PageKey | null {
    if (stories.length === 0) {
      return null;
    }

    const story = stories[0];
    return { id: story.id, timestamp: story.timestamp, type: 'prev' };
  }

  function nextKeyFn(stories: Array<Story>): PageKey | null {
    if (stories.length === 0) {
      return null;
    }

    const story = stories[stories.length - 1];
    return { id: story.id, timestamp: story.timestamp, type: 'next' };
  }

  if (!pageKey) {
    return { paginatedQuery: query, sort, prevKeyFn, nextKeyFn };
  }

  let paginatedQuery = query;

  const sortField = 'timestamp';
  const sortOperator = next ? '$lt' : '$gt';

  const paginationQuery = [
    { [sortField]: { [sortOperator]: pageKey[sortField] } },
    {
      $and: [{ [sortField]: pageKey[sortField] }, { id: { [sortOperator]: pageKey.id } }],
    },
  ];

  if (paginatedQuery.$or == null) {
    paginatedQuery.$or = paginationQuery;
  } else {
    paginatedQuery = { $and: [query, { $or: paginationQuery }] };
  }

  return { paginatedQuery, sort, prevKeyFn, nextKeyFn };
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
