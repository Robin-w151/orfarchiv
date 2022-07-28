# ORF Archiv Scraper

ORF Archiv Scraper is a *NodeJS* application, which fetches and persists ORF News Stories from multiple RSS feeds.

## Local Development

### Prerequisites

1. Start and configure a local *MongoDB* document store (more [info](../db/README.md))
2. Install *NodeJS* and *yarn*, e.g. with [Volta](https://volta.sh/)

### Run scraper

1. *Optionally*: create *.env.local* (copy from *.env* file) and configure **ORFARCHIV_DB_URL** env variable if
   your MongoDB is not running on **mongodb://localhost:27017**
2. `yarn install`
3. `yarn start`
