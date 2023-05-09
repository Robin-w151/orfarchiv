const { scrapeOrfNews } = require('./scrape');
const { persistOrfNews } = require('./db');
const sources = require('./sources.json');
const logger = require('./logger');
require('dotenv-flow').config({ silent: true });

main().catch(logger.error);

async function main() {
  try {
    for (const source of sources) {
      const stories = await scrapeOrfNews(source.rssUrl, source.source, source.alternativeFormat);
      await persistOrfNews(stories);
    }
  } catch (error) {
    logger.error(error.message);
  }
}
