# [ORF Archiv](https://orfarchiv.news/)

[![Website](https://img.shields.io/website?down_color=red&down_message=offline&up_color=brightgreen&up_message=online&url=https%3A%2F%2Forfarchiv.news)](https://orfarchiv.news)
[![Vercel](https://vercelbadge.vercel.app/api/Robin-w151/orfarchiv)](https://vercel.com)
[![Checkly](https://api.checklyhq.com/v1/badges/checks/73f3605f-2955-4560-bee9-36116ce4b3b9?style=flat&theme=default)](https://www.checklyhq.com/)
[![SonarCloud](https://sonarcloud.io/api/project_badges/measure?project=Robin-w151_orfarchiv&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Robin-w151_orfarchiv)
[![License](https://img.shields.io/github/license/Robin-w151/orfarchiv?color=blue)](https://github.com/Robin-w151/orfarchiv/blob/main/LICENSE)

Web application for browsing ORF News. Stories are sorted chronologically and included sources can be configured.

![Example](screenshot.png)

## Components

Information about component details can be found in each component's README.md file.

* [DB](db/README.md): Utility for starting a *MongoDB* instance (only required for local development)
* [Scraper](scraper/README.md): Fetches ORF News RSS feeds and persists story metadata to *MongoDB* document store
* [UI](ui/README.md): Frontend web application
