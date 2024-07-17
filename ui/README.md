# ORF Archiv UI

ORF Archiv UI is a web application powered by [SvelteKit](https://kit.svelte.dev/docs/introduction).
It serves links to ORF news stories from multiple sources, which are persisted in a _MongoDB_ document store.
This app includes both frontend and backend ([Endpoints](https://kit.svelte.dev/docs/routing#endpoints)) code,
so no separate backend application is required.

## Local Development

### Prerequisites

1. Start and configure a local _MongoDB_ document store (more [info](../db/README.md))
2. Install _NodeJS_ and _npm_, e.g. with [Volta](https://volta.sh/)

### Run DEV server

1. _Optionally_: create _.env.local_ (copy from _.env_ file) and configure **ORFARCHIV_DB_URL** environment variable if
   your _MongoDB_ is not running on **mongodb://localhost:27017**
2. `npm install`
3. `npm run dev`
4. Visit http://localhost:3001
