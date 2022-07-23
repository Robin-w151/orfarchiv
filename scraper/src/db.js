const { MongoClient } = require('mongodb');

async function persistOrfNews(stories) {
  console.log('Persisting non existing stories...');
  const storyIds = stories.map((story) => story.id);

  await withOrfArchivDb(async (newsCollection) => {
    const existingStories = new Map();
    (await newsCollection.find({ id: { $in: storyIds } }, { id: 1 }).toArray()).forEach((story) =>
      existingStories.set(story.id, story),
    );

    const storiesToInsert = stories
      .filter((story) => !existingStories.has(story.id))
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

    const storiesToUpdate = stories
      .filter((story) => existingStories.has(story.id))
      .map((story) => ({ ...story, timestamp: new Date(story.timestamp) }))
      .filter((story) => storyShouldUpdate(story, existingStories.get(story.id)));

    if (storiesToUpdate.length > 0) {
      const results = storiesToUpdate.map((story) => newsCollection.replaceOne({ id: story.id }, story));
      await Promise.all(results);
      console.log(
        'Updated story IDs:',
        storiesToUpdate.map((story) => story.id),
      );
    } else {
      console.log('Nothing to update.');
    }
  });
}

async function withOrfArchivDb(handler) {
  console.log('Connecting to DB...');
  const url = process.env.ORFARCHIV_DB_URL?.trim() || 'mongodb://localhost';
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

function storyShouldUpdate(newStory, oldStory) {
  return (
    newStory.title !== oldStory.title ||
    newStory.category !== oldStory.category ||
    newStory.url !== oldStory.url ||
    newStory.timestamp.toISOString() !== oldStory.timestamp.toISOString()
  );
}

module.exports = {
  persistOrfNews,
};
