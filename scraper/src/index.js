const { scrapeOrfNews } = require('./scrape');
const { persistOrfNews } = require('./db');
const sources = require('./sources.json');
require('dotenv-flow').config();

main();

async function main() {
  try {
    for (const source of sources) {
      const stories = await scrapeOrfNews(source.rssUrl, source.source, source.alternativeFormat);
      await persistOrfNews(stories);
    }
  } catch (error) {
    console.log(error.message);
  }
}
