export interface RdfDocument {
  'rdf:RDF': {
    item: Array<RdfItem>;
  };
}

export interface RdfItem {
  title: string;
  link: string;
  'dc:subject': string;
  'dc:date': string;
  'orfon:usid': string;
  'orfon:oewaCategory': {
    '@_rdf:resource': string;
  };
  'orfon:storyType': {
    '@_rdf:resource': string;
  };
  '@_rdf:about': string;
}
