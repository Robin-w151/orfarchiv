const logger = require('./logger');
const { MongoClient } = require('mongodb');
const { join } = require('path');
const { writeFile, mkdir } = require('fs').promises;
require('dotenv-flow').config({ silent: true });

main().catch(logger.error);

async function main() {
  try {
    await exportNews();
  } catch (error) {
    logger.error(error.message);
  }
}

async function exportNews() {
  const news = await withOrfArchivDb(async (newsCollection) => {
    logger.info('Fetching data...');
    return newsCollection.find().sort({ timestamp: -1 }).toArray();
  });

  logger.info('Persisting data to backup file...');
  const timestamp = getTimestamp();
  const backupPath = join(process.env.ORFARCHIV_BACKUP_DIR || '.backup');
  await mkdir(backupPath, { recursive: true });
  const backupFilePath = join(backupPath, `${timestamp}.json`);
  await writeFile(backupFilePath, JSON.stringify(news), { flag: 'w' });
}

async function withOrfArchivDb(handler) {
  logger.info('Connecting to DB...');
  const url = process.env.ORFARCHIV_DB_URL?.trim() || 'mongodb://localhost';
  let client;
  try {
    client = await MongoClient.connect(url);
    const db = client.db('orfarchiv');
    const newsCollection = db.collection('news');
    return await handler(newsCollection);
  } catch (error) {
    throw new Error(`DB error. Cause ${error.message}`);
  } finally {
    await client?.close();
  }
}

function getTimestamp() {
  const now = new Date();
  const nowString = now.toISOString();
  return nowString.replaceAll(':', '').split('.')[0] + 'Z';
}
