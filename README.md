# [ORF Archiv](https://orfarchiv.news)

[![Website](https://img.shields.io/website?url=https%3A%2F%2Forfarchiv.news&up_message=online&up_color=brightgreen&down_message=offline&down_color=red&style=for-the-badge)](https://orfarchiv.news)
[![GitHub License](https://img.shields.io/github/license/Robin-w151/orfarchiv?style=for-the-badge&color=blue)](https://github.com/Robin-w151/orfarchiv/blob/main/LICENSE)

Web application for browsing ORF News. Stories are sorted chronologically and included sources can be configured.

![Example](screenshot.png)

## Components

Information about component details can be found in each component's README.md file.

- [DB](db/README.md): Utility for starting a _MongoDB_ instance (only required for local development)
- [Scraper](scraper/README.md): Fetches ORF News RSS feeds and persists story metadata to _MongoDB_ document store
- [UI](ui/README.md): Main web application consisting of a UI + backend.
