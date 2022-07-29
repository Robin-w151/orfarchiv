# ORF Archiv Scraper

ORF Archiv Scraper is a *NodeJS* application, which fetches and persists ORF News Stories from multiple
[RSS feeds](https://rss.orf.at).

## RSS feeds

* [News](https://rss.orf.at/news.xml)
* [Sport](https://rss.orf.at/sport.xml)
* [Help](https://rss.orf.at/help.xml)
* [Science](https://rss.orf.at/science.xml)
* [OE3](https://rss.orf.at/oe3.xml)
* [FM4](https://rss.orf.at/fm4.xml)
* [Österreich](https://rss.orf.at/oesterreich.xml)
* [Burgenland](https://rss.orf.at/burgenland.xml)
* [Wien](https://rss.orf.at/wien.xml)
* [Niederösterreich](https://rss.orf.at/noe.xml)
* [Oberösterreich](https://rss.orf.at/ooe.xml)
* [Salzburg](https://rss.orf.at/salzburg.xml)
* [Steiermark](https://rss.orf.at/steiermark.xml)
* [Kärnten](https://rss.orf.at/kaernten.xml)
* [Tirol](https://rss.orf.at/tirol.xml)
* [Vorarlberg](https://rss.orf.at/vorarlberg.xml)

## Local Development

### Prerequisites

1. Start and configure a local *MongoDB* document store (more [info](../db/README.md))
2. Install *NodeJS* and *yarn*, e.g. with [Volta](https://volta.sh/)

### Run scraper

1. *Optionally*: create *.env.local* (copy from *.env* file) and configure **ORFARCHIV_DB_URL** environment variable if
   your *MongoDB* is not running on **mongodb://localhost:27017**
2. `yarn install`
3. `yarn start`
