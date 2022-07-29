# ORF Archiv UI

ORF Archiv UI is a web application powered by [SvelteKit](https://kit.svelte.dev/docs/introduction).
It serves links to ORF news stories from multiple sources, which are persisted in a *MongoDB* document store.
This app includes both frontend and backend ([Endpoints](https://kit.svelte.dev/docs/routing#endpoints)) code,
so no separate backend application is required.

## Local Development

### Prerequisites

1. Start and configure a local *MongoDB* document store (more [info](../db/README.md))
2. Install *NodeJS* and *yarn*, e.g. with [Volta](https://volta.sh/)

### Run DEV server

1. *Optionally*: create *.env.local* (copy from *.env* file) and configure **ORFARCHIV_DB_URL** environment variable if
   your *MongoDB* is not running on **mongodb://localhost:27017**
2. `yarn install`
3. `yarn run dev`
4. Visit http://localhost:3001
