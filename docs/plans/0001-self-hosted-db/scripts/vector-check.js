const results = [];

function t(name, fn) {
  try {
    results.push({ name, pass: true, detail: fn() });
  } catch (e) {
    results.push({ name, pass: false, detail: e.message });
  }
}

const o = db.getSiblingDB('orfarchiv');
const expectedFields = ['vector:titleEmbedding', 'filter:timestamp', 'filter:source', 'filter:category'];

t('news_title_vector definition', () => {
  const index = o.news.getSearchIndexes().find((i) => i.name === 'news_title_vector');
  if (!index) throw new Error('index missing');
  const fields = index.latestDefinition.fields;
  const actual = fields.map((f) => `${f.type}:${f.path}`);
  const vector = fields.find((f) => f.type === 'vector');
  if (
    vector.numDimensions !== 256 ||
    vector.similarity !== 'cosine' ||
    actual.length !== expectedFields.length ||
    !expectedFields.every((f) => actual.includes(f))
  ) {
    throw new Error(`unexpected definition ${JSON.stringify(fields)}`);
  }
  return `${vector.numDimensions} dims, ${vector.similarity}, ${actual.join(' ')}`;
});

t('news_title_vector queryable', () => {
  const index = o.news.getSearchIndexes().find((i) => i.name === 'news_title_vector');
  if (!index || index.status !== 'READY' || !index.queryable) {
    throw new Error(`status ${index?.status}, queryable ${index?.queryable}`);
  }
  return `${index.status}, queryable`;
});

const [src] = o.news
  .aggregate([
    { $match: { titleEmbedding: { $exists: true } } },
    { $sample: { size: 1 } },
    { $project: { _id: 0, id: 1, title: 1, source: 1, timestamp: 1, titleEmbedding: 1 } },
  ])
  .toArray();
if (!src) throw new Error('no document with titleEmbedding found');
print(`query story: ${src.id} (${src.source}, ${src.timestamp.toISOString()}) "${src.title}"`);

const vectorSearch = (filter) =>
  o.news
    .aggregate([
      {
        $vectorSearch: {
          index: 'news_title_vector',
          path: 'titleEmbedding',
          queryVector: src.titleEmbedding,
          numCandidates: 100,
          limit: 5,
          ...(filter ? { filter } : {}),
        },
      },
      { $project: { _id: 0, id: 1, title: 1, score: { $meta: 'vectorSearchScore' } } },
    ])
    .toArray();

const checkHits = (hits) => {
  hits.forEach((h) => print(`  ${h.score.toFixed(4)}  ${h.id}  ${h.title}`));
  const self = hits.find((h) => h.id === src.id);
  if (!self || self.score < 0.99) throw new Error('query story not among the hits with score >= 0.99');
  return `${hits.length} hits, query story score ${self.score.toFixed(4)}`;
};

t('$vectorSearch', () => checkHits(vectorSearch()));
t('$vectorSearch with filter', () =>
  checkHits(vectorSearch({ source: src.source, timestamp: { $lte: src.timestamp } })),
);

for (const r of results) {
  const detail = (typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail)).slice(0, 120);
  print(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(30)} ${detail}`);
}

const failed = results.filter((r) => !r.pass).length;
print(`${results.length - failed}/${results.length} passed`);
quit(failed ? 1 : 0);
