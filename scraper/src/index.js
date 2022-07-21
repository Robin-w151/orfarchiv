const { scrapeOrfNews } = require('./scrape');
const { persistOrfNews } = require('./db');

const rssOrfUrl = 'https://rss.orf.at/news.xml';

main();

async function main() {
  try {
    const stories = await scrapeOrfNews(rssOrfUrl);
    await persistOrfNews(stories);
  } catch (error) {
    console.log(error.message);
  }
}
