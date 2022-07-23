const { scrapeOrfNews } = require('./scrape');
const { persistOrfNews } = require('./db');

const sources = [
  {
    source: 'news',
    rssUrl: 'https://rss.orf.at/news.xml',
  },
  {
    source: 'sport',
    rssUrl: 'https://rss.orf.at/sport.xml',
  },
  {
    source: 'oe3',
    rssUrl: 'https://rss.orf.at/oe3.xml',
  },
  {
    source: 'fm4',
    rssUrl: 'https://rss.orf.at/fm4.xml',
  },
];

main();

async function main() {
  try {
    for (const source of sources) {
      const stories = await scrapeOrfNews(source.rssUrl, source.source);
      await persistOrfNews(stories);
    }
  } catch (error) {
    console.log(error.message);
  }
}
