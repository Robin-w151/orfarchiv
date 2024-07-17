# ORF Archiv Scraper

ORF Archiv Scraper is a _NodeJS_ application, which fetches and persists ORF News Stories from multiple
[RSS feeds](https://rss.orf.at).

## RSS feeds

- [News](https://rss.orf.at/news.xml)
- [Sport](https://rss.orf.at/sport.xml)
- [Help](https://rss.orf.at/help.xml)
- [Science](https://rss.orf.at/science.xml)
- [OE3](https://rss.orf.at/oe3.xml)
- [FM4](https://rss.orf.at/fm4.xml)
- [Österreich](https://rss.orf.at/oesterreich.xml)
- [Burgenland](https://rss.orf.at/burgenland.xml)
- [Wien](https://rss.orf.at/wien.xml)
- [Niederösterreich](https://rss.orf.at/noe.xml)
- [Oberösterreich](https://rss.orf.at/ooe.xml)
- [Salzburg](https://rss.orf.at/salzburg.xml)
- [Steiermark](https://rss.orf.at/steiermark.xml)
- [Kärnten](https://rss.orf.at/kaernten.xml)
- [Tirol](https://rss.orf.at/tirol.xml)
- [Vorarlberg](https://rss.orf.at/vorarlberg.xml)

## Local Development

### Prerequisites

1. Start and configure a local _MongoDB_ document store (more [info](../db/README.md))
2. Install _NodeJS_ and _npm_, e.g. with [Volta](https://volta.sh/)

### Run scraper

1. _Optionally_: create _.env.local_ (copy from _.env_ file) and configure **ORFARCHIV_DB_URL** environment variable if
   your _MongoDB_ is not running on **mongodb://localhost:27017**
2. `npm install`
3. `npm start`
