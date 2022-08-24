# ORF Archiv
![Vercel](https://vercelbadge.vercel.app/api/Robin-w151/orfarchiv) ![Checkly](https://api.checklyhq.com/v1/badges/checks/73f3605f-2955-4560-bee9-36116ce4b3b9?style=flat&theme=default) ![License](https://img.shields.io/badge/License-MIT-blue.svg)

Web application for browsing ORF News. Stories are sorted chronologically and included sources can be configured.

Homepage: https://orfarchiv.news

![Example](screenshot.png)

## Components

Information about component details can be found in each component's README.md file.

* [DB](db/README.md): Utility for starting a *MongoDB* instance (only required for local development)
* [Scraper](scraper/README.md): Fetches ORF News RSS feeds and persists story metadata to *MongoDB* document store
* [UI](ui/README.md): Frontend web application
