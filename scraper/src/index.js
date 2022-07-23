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
    source: 'help',
    rssUrl: 'https://rss.orf.at/help.xml',
    alternativeFormat: true,
  },
  {
    source: 'science',
    rssUrl: 'https://rss.orf.at/science.xml',
    alternativeFormat: true,
  },
  {
    source: 'oe3',
    rssUrl: 'https://rss.orf.at/oe3.xml',
  },
  {
    source: 'fm4',
    rssUrl: 'https://rss.orf.at/fm4.xml',
  },
  {
    source: 'burgenland',
    rssUrl: 'https://rss.orf.at/burgenland.xml',
    alternativeFormat: true,
  },
  {
    source: 'wien',
    rssUrl: 'https://rss.orf.at/wien.xml',
    alternativeFormat: true,
  },
  {
    source: 'noe',
    rssUrl: 'https://rss.orf.at/noe.xml',
    alternativeFormat: true,
  },
  {
    source: 'ooe',
    rssUrl: 'https://rss.orf.at/ooe.xml',
    alternativeFormat: true,
  },
  {
    source: 'salzburg',
    rssUrl: 'https://rss.orf.at/salzburg.xml',
    alternativeFormat: true,
  },
  {
    source: 'steiermark',
    rssUrl: 'https://rss.orf.at/steiermark.xml',
    alternativeFormat: true,
  },
  {
    source: 'kaernten',
    rssUrl: 'https://rss.orf.at/kaernten.xml',
    alternativeFormat: true,
  },
  {
    source: 'tirol',
    rssUrl: 'https://rss.orf.at/tirol.xml',
    alternativeFormat: true,
  },
  {
    source: 'vorarlberg',
    rssUrl: 'https://rss.orf.at/vorarlberg.xml',
    alternativeFormat: true,
  },
];

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
