import { type Collection, MongoClient, type Sort, type WithId } from 'mongodb';
import type { News } from '$lib/models/news';
import type { Story } from '$lib/models/story';
import type { SearchRequest, SearchRequestParameters } from '$lib/models/searchRequest';
import type { PageKey } from '$lib/models/pageKey';

type PageKeyFn = (stories: Array<Story>) => PageKey | null;

interface PaginatedQuery {
  paginatedQuery: any;
  sort: Sort;
  prevKeyFn: PageKeyFn;
  nextKeyFn: PageKeyFn;
}

const PAGE_LIMIT = 100;

export async function searchNews(searchRequest: SearchRequest): Promise<News> {
  const { searchRequestParameters, pageKey } = searchRequest;

  const query = buildQuery(searchRequestParameters);
  const { paginatedQuery, sort, prevKeyFn, nextKeyFn } = generatePaginationQuery(query, pageKey);
  const limit = pageKey?.type === 'prev' ? 0 : PAGE_LIMIT + 1;

  return withOrfArchivDb(async (newsCollection) => {
    const stories = await executeQuery(newsCollection, paginatedQuery, sort, limit);
    const orderedStories = correctOrder(stories, pageKey);
    const { prevKey, nextKey } = getPageKeys(stories, prevKeyFn, nextKeyFn, pageKey);
    return { stories: orderedStories.filter((_, index) => index < PAGE_LIMIT).map(mapToStory), prevKey, nextKey };
  });
}

function buildQuery({ textFilter, dateFilter, sources }: SearchRequestParameters) {
  const textFilters = textFilter
    ?.split(/\s+/)
    .filter((text) => !!text)
    .map((text) => new RegExp(`${text}`, 'i'));

  const textQuery =
    textFilters && textFilters.length > 0
      ? {
          $and: textFilters?.map((filter) => ({
            $or: ['title', 'category', 'source'].map((key) => ({ [key]: { $in: [filter] } })),
          })),
        }
      : {};

  const fromDate = dateFilter?.from?.toJSDate();
  const fromQuery = fromDate ? { timestamp: { $gte: fromDate } } : {};

  const toDate = dateFilter?.to?.toJSDate();
  const toQuery = toDate ? { timestamp: { $lte: toDate } } : {};

  const sourceQuery = sources?.length && sources.length > 0 ? { source: { $in: sources } } : {};
  return { $and: [textQuery, fromQuery, toQuery, sourceQuery] };
}

async function withOrfArchivDb(handler: (newsCollection: Collection) => Promise<any>) {
  const url = process.env.ORFARCHIV_DB_URL?.trim() || 'mongodb://localhost';
  let client;
  try {
    client = await MongoClient.connect(url);
    const db = client.db('orfarchiv');
    const newsCollection = db.collection('news');
    return await handler(newsCollection);
  } catch (error: any) {
    throw new Error(`DB error. Cause: ${error.message}`);
  } finally {
    await client?.close();
  }
}

function generatePaginationQuery(query: any, pageKey?: PageKey): PaginatedQuery {
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
    if (stories.length < PAGE_LIMIT + 1) {
      return null;
    }

    const story = stories[stories.length - 2];
    return { id: story.id, timestamp: story.timestamp, type: 'next' };
  }

  if (!pageKey) {
    return { paginatedQuery: query, sort, prevKeyFn, nextKeyFn };
  }

  let paginatedQuery = query;

  const sortField = 'timestamp';
  const sortFieldValue = new Date(pageKey[sortField]);
  const sortOperator = next ? '$lt' : '$gt';

  const paginationQuery = [
    { [sortField]: { [sortOperator]: sortFieldValue } },
    {
      $and: [{ [sortField]: sortFieldValue }, { id: { [sortOperator]: pageKey.id } }],
    },
  ];

  if (paginatedQuery.$or == null) {
    paginatedQuery.$or = paginationQuery;
  } else {
    paginatedQuery = { $and: [query, { $or: paginationQuery }] };
  }

  return { paginatedQuery, sort, prevKeyFn, nextKeyFn };
}

function executeQuery(newsCollection: Collection, query: any, sort: Sort, limit: number): Promise<Array<Story>> {
  return newsCollection.find(query).limit(limit).sort(sort).toArray() as unknown as Promise<Array<Story>>;
}

function correctOrder(stories: Array<Story>, pageKey?: PageKey): Array<Story> {
  return pageKey?.type === 'prev' ? stories.reverse() : stories;
}

function getPageKeys(
  stories: Array<Story>,
  prevKeyFn: PageKeyFn,
  nextKeyFn: PageKeyFn,
  pageKey?: PageKey,
): { prevKey?: PageKey | null; nextKey?: PageKey | null } {
  const prevKey = !pageKey || pageKey?.type === 'prev' ? prevKeyFn(stories) : undefined;
  const nextKey = !pageKey || pageKey?.type === 'next' ? nextKeyFn(stories) : undefined;
  return { prevKey, nextKey };
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