const logger = require('./logger');
const { MongoClient } = require('mongodb');

main().catch(logger.error);

async function main() {
  logger.info('Connecting to server...');
  const url = process.env.ORFARCHIV_DB_URL?.trim() || 'mongodb://localhost';
  const client = await MongoClient.connect(url);

  logger.info('Creating orfarchiv DB...');
  const db = client.db('orfarchiv');

  logger.info('Creating news collection...');
  const collections = await db.collections();
  if (!collections.find((collection) => collection.collectionName === 'news')) {
    await db.createCollection('news');
    const news = db.collection('news');
    await news.createIndexes([
      {
        id: 1,
      },
      {
        id: -1,
      },
      {
        timestamp: 1,
      },
      {
        timestamp: -1,
      },
    ]);
  }

  await client.close();
  logger.info('Done.');
}
