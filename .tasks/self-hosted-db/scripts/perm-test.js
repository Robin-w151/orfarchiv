const results = [];

function t(name, expectOk, fn) {
  const expected = expectOk ? 'ok' : 'denied';
  try {
    const detail = fn();
    results.push({ name, expected, actual: 'ok', pass: expectOk, detail });
  } catch (e) {
    const denied = /Unauthorized|not authorized/i.test(`${e.codeName} ${e.message}`);
    results.push({ name, expected, actual: e.codeName || e.name, pass: !expectOk && denied, detail: e.message });
  }
}

const o = db.getSiblingDB('orfarchiv');
const authInfo = db.getSiblingDB('admin').runCommand({ connectionStatus: 1 }).authInfo;
print(`authInfo: ${JSON.stringify({ users: authInfo.authenticatedUsers, roles: authInfo.authenticatedUserRoles })}`);

const canWrite = authInfo.authenticatedUserRoles.some((r) => r.db === 'orfarchiv' && r.role === 'readWrite');

const src = o.news.findOne({ titleEmbedding: { $exists: true } }, { id: 1, source: 1, titleEmbedding: 1 });
if (!src) throw new Error('no document with titleEmbedding found, run seed.js first');

const vectorSearch = (filter) =>
  o.news
    .aggregate([
      {
        $vectorSearch: {
          index: 'news_title_vector',
          path: 'titleEmbedding',
          queryVector: src.titleEmbedding,
          numCandidates: 100,
          limit: 3,
          ...(filter ? { filter } : {}),
        },
      },
      { $project: { _id: 0, id: 1, score: { $meta: 'vectorSearchScore' } } },
    ])
    .toArray();

t('find news', true, () => o.news.countDocuments());
t('$vectorSearch', true, () => {
  const hits = vectorSearch();
  if (!hits.length || hits[0].id !== src.id) throw new Error(`unexpected result ${JSON.stringify(hits)}`);
  return hits;
});
t('$vectorSearch with filter', true, () => {
  const hits = vectorSearch({ source: src.source });
  if (!hits.length) throw new Error('empty result');
  return `${hits.length} hits`;
});
t('listSearchIndexes', true, () => o.news.getSearchIndexes().map((i) => `${i.name}:${i.status}`));
t('insertOne', canWrite, () => o.news.insertOne({ id: 'permtest:1', title: 'permtest', timestamp: new Date() }).acknowledged);
t('deleteMany', canWrite, () => o.news.deleteMany({ id: 'permtest:1' }).deletedCount);
t('createIndex', canWrite, () => o.permtest_coll.createIndex({ x: 1 }, { name: 'permtest_idx' }));
t('dropIndex', canWrite, () => o.permtest_coll.dropIndex('permtest_idx'));
t('createSearchIndex', canWrite, () =>
  o.permtest_coll.createSearchIndex('permtest_search', { mappings: { dynamic: false, fields: { x: { type: 'string' } } } }),
);
t('dropSearchIndex', canWrite, () => {
  o.permtest_coll.dropSearchIndex('permtest_search');
  return true;
});
t('createCollection', canWrite, () => o.createCollection('permtest'));
t('dropCollection', canWrite, () => o.permtest.drop() && o.permtest_coll.drop());
t('read admin.system.users', false, () => db.getSiblingDB('admin').system.users.findOne());
t('write other db', false, () => db.getSiblingDB('permtest_other').x.insertOne({}).acknowledged);
t('usersInfo', false, () => db.getSiblingDB('admin').getUsers());
t('createUser', false, () =>
  db.getSiblingDB('admin').createUser({ user: 'permtest_evil', pwd: 'x', roles: ['root'] }),
);

for (const r of results) {
  const detail = (typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail)).slice(0, 100);
  print(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(26)} expected=${r.expected.padEnd(6)} actual=${r.actual.padEnd(12)} ${detail}`);
}

const failed = results.filter((r) => !r.pass).length;
print(`${results.length - failed}/${results.length} passed`);
quit(failed ? 1 : 0);
