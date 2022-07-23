const { get } = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function scrapeOrfNews(url, source) {
  const data = await fetchOrfNews(url);
  return collectStories(data, source);
}

async function fetchOrfNews(url) {
  console.log('Fetching ORF news data...');
  try {
    const response = await get(url);
    return response.data;
  } catch (error) {
    throw Error(`Failed to fetch ORF News. Cause: ${error.message}`);
  }
}

function collectStories(data, source) {
  console.log('Parsing ORF news data...');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const document = parser.parse(data);
  const items = document?.['rdf:RDF']?.item;
  return items?.filter(filterStoryRdfItem).map(mapToStory.bind(null, source)) ?? [];
}

function filterStoryRdfItem(rdfItem) {
  return rdfItem && rdfItem.link?.includes('stories');
}

function mapToStory(source, rdfItem) {
  return {
    id: rdfItem['orfon:usid'],
    title: rdfItem.title.trim(),
    category: rdfItem['dc:subject'],
    url: rdfItem.link,
    timestamp: rdfItem['dc:date'],
    source,
  };
}

module.exports = {
  scrapeOrfNews,
};
