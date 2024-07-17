# ORF Archiv DB

ORF Archiv DB is a utility package used for local development and backups. It contains a simple _docker-compose_ file to quickly
start a local _MongoDB_ instance. Additionally, it also starts a _mongo-express_ server to inspect your _MongoDB_ with
a web UI.

The backup script can connect to any _MongoDB_ server and export all news content to the specified backup directory.
The following 2 environment variables are available:

- ORFARCHIV_DB_URL
- ORFARCHIV_BACKUP_DIR

## Run

1. docker-compose up -d
2. Visit http://localhost:3002
3. Create _orfarchiv_ database
4. Create _news_ collection in the _orfarchiv_ database
5. Create an index for _id_ (unique) and _timestamp_ (descending order) field

## Run backup

1. _Optionally_: create _.env.local_ (copy from _.env_ file) and configure **ORFARCHIV_DB_URL** environment variable if
   your _MongoDB_ is not running on **mongodb://localhost:27017**
2. `npm install`
3. `npm start`
