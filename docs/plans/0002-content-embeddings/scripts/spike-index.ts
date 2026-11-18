import { readFileSync, existsSync } from 'node:fs';
import type { Binary, Collection, Db, Document } from 'mongodb';
import { embed, outPath, quantize, sleep, table, toContentInput, truncateToTokens, withDb, writeJson } from './spike-lib.ts';

const SPIKE = 'news_spike';
const SPIKE_FULL = 'news_spike_full';
const RECENT = 5_000;
const CONTENT_DIMENSIONS = 768;
const TRUNCATE_TOKENS = 1024;
const fullContent = process.argv.includes('--full-content');

const filters = [
  { type: 'filter', path: 'timestamp' },
  { type: 'filter', path: 'source' },
  { type: 'filter', path: 'category' },
];
const titleOnlyDefinition = {
  fields: [{ type: 'vector', path: 'titleEmbedding', numDimensions: 256, similarity: 'cosine' }, ...filters],
};
const twoPathDefinition = {
  fields: [
    { type: 'vector', path: 'titleEmbedding', numDimensions: 256, similarity: 'cosine' },
    { type: 'vector', path: 'contentEmbedding', numDimensions: CONTENT_DIMENSIONS, similarity: 'cosine' },
    ...filters,
  ],
};

async function waitQueryable(collection: Collection, name: string) {
  const started = Date.now();
  for (;;) {
    const [index] = await collection.listSearchIndexes(name).toArray();
    if (index?.status === 'FAILED') throw new Error(`${name} failed: ${JSON.stringify(index)}`);
    if (index?.queryable) return (Date.now() - started) / 1000;
    await sleep(2_000);
  }
}

async function createAndWait(collection: Collection, name: string, definition: Document) {
  const started = Date.now();
  await collection.createSearchIndex({ name, type: 'vectorSearch', definition });
  await waitQueryable(collection, name);
  return (Date.now() - started) / 1000;
}

async function vectorSearch(collection: Collection, index: string, path: string, queryVector: Binary, filter?: Document) {
  return collection
    .aggregate([
      { $vectorSearch: { index, path, queryVector, numCandidates: 100, limit: 5, ...(filter ? { filter } : {}) } },
      { $project: { _id: 0, id: 1, title: 1, score: { $meta: 'vectorSearchScore' } } },
    ])
    .toArray();
}

async function selfRecall(collection: Collection, index: string, path: string, samples = 50) {
  const docs = await collection.aggregate([{ $match: { [path]: { $exists: true } } }, { $sample: { size: samples } }, { $project: { id: 1, [path]: 1 } }]).toArray();
  let hits = 0;
  for (const doc of docs) {
    const [top] = await collection
      .aggregate([{ $vectorSearch: { index, path, queryVector: doc[path], numCandidates: 200, limit: 10 } }, { $project: { id: 1, score: { $meta: 'vectorSearchScore' } } }])
      .toArray();
    if (top && (top.id === doc.id || top.score > 0.9999)) hits++;
  }
  return `${hits}/${docs.length}`;
}

function bodyFor(id: string) {
  const file = outPath('text', 'extra', `${id.replace(':', '_')}.txt`);
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').slice(3).join('\n').trim() : null;
}

async function embedContent(db: Db) {
  const spike = db.collection(SPIKE);
  const docs = await spike.find({}, { projection: { _id: 0, id: 1, title: 1 } }).toArray();
  let bodies = 0;
  const writes = [];
  for (let i = 0; i < docs.length; i += 32) {
    const batch = docs.slice(i, i + 32);
    const inputs = [];
    for (const doc of batch) {
      const body = bodyFor(doc.id);
      if (body) bodies++;
      inputs.push(body ? (await truncateToTokens(toContentInput(doc.title, body), TRUNCATE_TOKENS)).text : `title: none | text: ${doc.title}`);
    }
    const { vectors } = await embed(inputs);
    batch.forEach((doc, j) => writes.push({ updateOne: { filter: { id: doc.id }, update: { $set: { contentEmbedding: quantize(vectors[j].slice(0, CONTENT_DIMENSIONS)) } } } }));
  }
  await spike.bulkWrite(writes, { ordered: false });
  return { docs: docs.length, bodies, titles: docs.length - bodies };
}

async function fillAllContent(db: Db) {
  const source = await db.collection(SPIKE).find({}, { projection: { _id: 0, contentEmbedding: 1 } }).toArray();
  const full = db.collection(SPIKE_FULL);
  const cursor = full.find({ contentEmbedding: { $exists: false } }, { projection: { _id: 1 } });
  let n = 0;
  let writes = [];
  for await (const doc of cursor) {
    writes.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { contentEmbedding: source[n++ % source.length].contentEmbedding } } } });
    if (writes.length === 2_000) {
      await full.bulkWrite(writes, { ordered: false });
      writes = [];
    }
  }
  if (writes.length) await full.bulkWrite(writes, { ordered: false });
  return n;
}

const results: Record<string, unknown> = {};

await withDb(async (client) => {
  const db = client.db('orfarchiv');
  const news = db.collection('news');
  const newsBefore = { count: await news.estimatedDocumentCount(), index: await news.listSearchIndexes().toArray() };

  try {
    await news.aggregate([{ $sort: { timestamp: -1 } }, { $limit: RECENT }, { $out: SPIKE }]).toArray();
    const spike = db.collection(SPIKE);
    await spike.createIndex({ id: 1 }, { unique: true });
    results.embedded = await embedContent(db);
    console.log('embedded', results.embedded);

    results.titleOnlyIndexSeconds = await createAndWait(spike, 'spike_title_only', titleOnlyDefinition);
    results.twoPathIndexSeconds = await createAndWait(spike, 'spike_two_path', twoPathDefinition);
    console.log('5k indexes queryable', results.titleOnlyIndexSeconds, results.twoPathIndexSeconds);

    const probe = (await spike.findOne({ contentEmbedding: { $exists: true } }))!;
    const since = { timestamp: { $gte: new Date(Date.now() - 365 * 86_400_000) } };
    results.twoPathTitleQuery = await vectorSearch(spike, 'spike_two_path', 'titleEmbedding', probe.titleEmbedding, since);
    results.twoPathContentQuery = await vectorSearch(spike, 'spike_two_path', 'contentEmbedding', probe.contentEmbedding, since);
    console.log('probe', probe.id, probe.title);
    table(results.twoPathTitleQuery as Document[]);
    table(results.twoPathContentQuery as Document[]);

    try {
      results.missingPath = { result: await vectorSearch(spike, 'spike_title_only', 'contentEmbedding', probe.contentEmbedding) };
    } catch (error) {
      const e = error as { code?: number; codeName?: string; message: string };
      results.missingPath = { error: { code: e.code, codeName: e.codeName, message: e.message } };
    }
    try {
      results.wrongDimensions = { result: await vectorSearch(spike, 'spike_two_path', 'contentEmbedding', probe.titleEmbedding) };
    } catch (error) {
      const e = error as { code?: number; codeName?: string; message: string };
      results.wrongDimensions = { error: { code: e.code, codeName: e.codeName, message: e.message } };
    }
    try {
      results.missingIndex = { result: await vectorSearch(spike, 'does_not_exist', 'titleEmbedding', probe.titleEmbedding) };
    } catch (error) {
      const e = error as { code?: number; codeName?: string; message: string };
      results.missingIndex = { error: { code: e.code, codeName: e.codeName, message: e.message } };
    }
    console.log('missing path', JSON.stringify(results.missingPath));
    console.log('wrong dimensions', JSON.stringify(results.wrongDimensions));
    console.log('missing index', JSON.stringify(results.missingIndex));

    let started = Date.now();
    await news.aggregate([{ $out: SPIKE_FULL }]).toArray();
    const full = db.collection(SPIKE_FULL);
    await full.createIndex({ id: 1 }, { unique: true });
    await spike.aggregate([{ $project: { _id: 0, id: 1, contentEmbedding: 1 } }, { $merge: { into: SPIKE_FULL, on: 'id', whenMatched: 'merge', whenNotMatched: 'discard' } }]).toArray();
    results.fullCopySeconds = (Date.now() - started) / 1000;
    results.fullCounts = { docs: await full.estimatedDocumentCount(), title: await full.countDocuments({ titleEmbedding: { $exists: true } }), content: await full.countDocuments({ contentEmbedding: { $exists: true } }) };
    console.log('full copy', results.fullCopySeconds, results.fullCounts);

    results.fullTwoPathIndexSeconds = await createAndWait(full, 'spike_full_two_path', twoPathDefinition);
    results.fullTwoPathRecall = { title: await selfRecall(full, 'spike_full_two_path', 'titleEmbedding'), content: await selfRecall(full, 'spike_full_two_path', 'contentEmbedding') };
    console.log('full two-path index queryable after', results.fullTwoPathIndexSeconds, 's, self-recall', results.fullTwoPathRecall);

    if (fullContent) {
      started = Date.now();
      results.filledContent = await fillAllContent(db);
      console.log('filled content on', results.filledContent, 'docs in', (Date.now() - started) / 1000, 's');
      await full.dropSearchIndex('spike_full_two_path');
      while ((await full.listSearchIndexes().toArray()).length) await sleep(2_000);
      results.fullAllContentIndexSeconds = await createAndWait(full, 'spike_full_two_path', twoPathDefinition);
      results.fullAllContentRecall = { title: await selfRecall(full, 'spike_full_two_path', 'titleEmbedding'), content: await selfRecall(full, 'spike_full_two_path', 'contentEmbedding') };
      console.log('full two-path index with content on all docs queryable after', results.fullAllContentIndexSeconds, 's, self-recall', results.fullAllContentRecall);
    }
  } finally {
    await db.collection(SPIKE).drop().catch(() => undefined);
    await db.collection(SPIKE_FULL).drop().catch(() => undefined);
    const newsAfter = { count: await news.estimatedDocumentCount(), index: await news.listSearchIndexes().toArray() };
    results.cleanup = {
      collections: (await db.listCollections().toArray()).map((c) => c.name),
      newsCountUnchanged: newsBefore.count === newsAfter.count,
      newsIndexUnchanged: JSON.stringify(newsBefore.index.map((i) => [i.name, i.latestDefinition])) === JSON.stringify(newsAfter.index.map((i) => [i.name, i.latestDefinition])),
      newsIndexQueryable: newsAfter.index.every((i) => i.queryable),
    };
    console.log('cleanup', results.cleanup);
    writeJson('index.json', results);
  }
});
