const o = db.getSiblingDB('orfarchiv');
const sources = ['news', 'sport', 'science'];
const categories = ['Inland', 'Ausland', 'Wirtschaft'];
let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const docs = Array.from({ length: 30 }, (_, i) => ({
  id: `spike:${i}`,
  title: `Synthetic title ${i}`,
  source: sources[i % 3],
  category: categories[i % 3],
  timestamp: new Date(Date.UTC(2026, 8, 1 + (i % 12))),
  titleEmbedding: Binary.fromInt8Array(Int8Array.from({ length: 256 }, () => Math.floor(rnd() * 255) - 127)),
}));

o.news.deleteMany({ id: /^spike:/ });
o.news.insertMany(docs);
print(`seeded ${docs.length} docs, collection now has ${o.news.countDocuments()}`);

for (let i = 0; i < 60; i++) {
  const idx = o.news.getSearchIndexes().find((x) => x.name === 'news_title_vector');
  if (idx?.status === 'READY' && idx.queryable) {
    const hits = o.news
      .aggregate([
        {
          $vectorSearch: {
            index: 'news_title_vector',
            path: 'titleEmbedding',
            queryVector: docs[0].titleEmbedding,
            numCandidates: 100,
            limit: 1,
          },
        },
      ])
      .toArray();
    if (hits.length) {
      print(`index READY and returning hits after ~${i * 2}s`);
      quit(0);
    }
  }
  sleep(2000);
}

print('index did not become queryable within 120s');
quit(1);
