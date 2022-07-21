const { MongoClient } = require('mongodb');

async function persistOrfNews(stories) {
  console.log('Persisting non existing stories...');
  const storyIds = stories.map((story) => story.id);

  await withOrfArchivDb(async (newsCollection) => {
    const existingStoryIds = (await newsCollection.find({ id: { $in: storyIds } }, { id: 1 }).toArray()).map(
      (story) => story.id,
    );
    const storiesToInsert = stories
      .filter((story) => !existingStoryIds.includes(story.id))
      .map((story) => ({ ...story, timestamp: new Date(story.timestamp) }));

    if (storiesToInsert.length > 0) {
      await newsCollection.insertMany(storiesToInsert);
      console.log(
        'Inserted story IDs:',
        storiesToInsert.map((story) => story.id),
      );
    } else {
      console.log('Nothing to insert.');
    }
  });
}

async function withOrfArchivDb(handler) {
  console.log('Connecting to DB...');
  const url = process.env.DB_URL || 'mongodb://localhost';
  let client;
  try {
    client = await MongoClient.connect(url);
    const db = client.db('orfarchiv');
    const newsCollection = db.collection('news');
    await handler(newsCollection);
  } catch (error) {
    throw new Error(`DB error. Cause ${error.message}`);
  } finally {
    await client?.close();
  }
}

module.exports = {
  persistOrfNews,
};
