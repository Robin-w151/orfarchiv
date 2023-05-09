const { get } = require('axios');
const { XMLParser } = require('fast-xml-parser');
const RE2 = require('re2');
const logger = require('./logger');

const GUID_RE2 = new RE2('/stories/(?<id>[0-9]+)');

async function scrapeOrfNews(url, source) {
  logger.info(`Scraping RSS feed: '${source}'`);
  const data = await fetchOrfNews(url);
  return collectStories(data, source);
}

async function fetchOrfNews(url) {
  logger.info('Fetching data...');
  try {
    const response = await get(url);
    return response.data;
  } catch (error) {
    throw Error(`Failed to fetch ORF News. Cause: ${error.message}`);
  }
}

function collectStories(data, source) {
  logger.info(`Parsing data...`);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const document = parser.parse(data);

  const [format, items] = detectFormat(document);
  logger.info(`Detected format: '${format}'`);

  return items?.filter(filterStoryRdfItem).map(mapToStory.bind(null, source, format)).filter(isValidStory) ?? [];
}

function detectFormat(document) {
  let items;

  items = document?.['rdf:RDF']?.item;
  if (items && Array.isArray(items)) {
    return ['RDF', items];
  }

  items = document?.rss?.channel?.item;
  if (items && Array.isArray(items)) {
    return ['SIMPLE', items];
  }

  return ['UNKNOWN', []];
}

function filterStoryRdfItem(rdfItem) {
  return rdfItem?.link?.includes('stories');
}

function mapToStory(source, format, item) {
  if (format === 'RDF') {
    return mapRdfToStory(source, item);
  }
  if (format === 'SIMPLE') {
    return mapSimpleToStory(source, item);
  }
  return null;
}

function mapRdfToStory(source, rdfItem) {
  return {
    id: rdfItem['orfon:usid'],
    title: rdfItem.title.trim(),
    category: rdfItem['dc:subject'],
    url: rdfItem.link,
    timestamp: rdfItem['dc:date'] || fallbackTimestamp(),
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
    timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : fallbackTimestamp(),
    source,
  };
}

function fallbackTimestamp() {
  return new Date().toISOString();
}

function isValidStory(story) {
  const isValid = !!story.id && !!story.title && !!story.url && !!story.timestamp && !!story.source;
  if (!isValid) {
    logger.warn(`Invalid story found: ${story.id}`);
  }
  return isValid;
}

module.exports = {
  scrapeOrfNews,
};
