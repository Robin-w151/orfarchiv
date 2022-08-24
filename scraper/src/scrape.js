const { get } = require('axios');
const { XMLParser } = require('fast-xml-parser');
const RE2 = require('re2');

const GUID_RE2 = new RE2('/stories/(?<id>[0-9]+)');

async function scrapeOrfNews(url, source, alternativeFormat = false) {
  console.log(`Scraping RSS feed: '${source}'`);
  const data = await fetchOrfNews(url);
  return collectStories(data, source, alternativeFormat);
}

async function fetchOrfNews(url) {
  console.log('Fetching data...');
  try {
    const response = await get(url);
    return response.data;
  } catch (error) {
    throw Error(`Failed to fetch ORF News. Cause: ${error.message}`);
  }
}

function collectStories(data, source, alternativeFormat) {
  console.log(`Parsing data${alternativeFormat ? ' (alternative format) ' : ''}...`);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const document = parser.parse(data);
  const items = alternativeFormat ? document?.rss?.channel?.item : document?.['rdf:RDF']?.item;
  return (
    items
      ?.filter(filterStoryRdfItem)
      .map(mapToStory.bind(null, source, alternativeFormat))
      .filter((story) => !!story.id) ?? []
  );
}

function filterStoryRdfItem(rdfItem) {
  return rdfItem && rdfItem.link?.includes('stories');
}

function mapToStory(source, alternativeFormat, item) {
  return alternativeFormat ? mapSimpleToStory(source, item) : mapRdfToStory(source, item);
}

function mapRdfToStory(source, rdfItem) {
  return {
    id: rdfItem['orfon:usid'],
    title: rdfItem.title.trim(),
    category: rdfItem['dc:subject'],
    url: rdfItem.link,
    timestamp: rdfItem['dc:date'],
    source,
  };
}

function mapSimpleToStory(source, item) {
  const id = GUID_RE2.match(item.guid['#text'])?.groups.id;
  return {
    id: id ? `${source}:${id}` : undefined,
    title: item.title.trim(),
    category: item.category,
    url: item.link,
    timestamp: new Date(item.pubDate).toISOString(),
    source,
  };
}

module.exports = {
  scrapeOrfNews,
};
