const { get } = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function scrapeOrfNews(url) {
  const data = await fetchOrfNews(url);
  return collectStories(data);
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

function collectStories(data) {
  console.log('Parsing ORF news data...');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const document = parser.parse(data);
  const items = document?.['rdf:RDF']?.item;
  return items?.filter(filterStoryRdfItem).map(mapToStory) ?? [];
}

function filterStoryRdfItem(rdfItem) {
  return rdfItem && rdfItem.link?.includes('stories');
}

function mapToStory(rdfItem) {
  return {
    id: rdfItem['orfon:usid'],
    title: rdfItem.title.trim(),
    category: rdfItem['dc:subject'],
    url: rdfItem.link,
    timestamp: rdfItem['dc:date'],
  };
}

module.exports = {
  scrapeOrfNews,
};
