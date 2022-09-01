# ORF Archiv DB

ORF Archiv DB is a utility package used for local development and backups. It contains a simple *docker-compose* file to quickly
start a local *MongoDB* instance. Additionally, it also starts a *mongo-express* server to inspect your *MongoDB* with
a web UI.

The backup script can connect to any *MongoDB* server and export all news content to the specified backup directory.
The following 2 environment variables are available:

* ORFARCHIV_DB_URL
* ORFARCHIV_BACKUP_DIR

## Run

1. docker-compose up -d
2. Visit http://localhost:3002
3. Create *orfarchiv* database
4. Create *news* collection in the *orfarchiv* database
5. Create an index for *id* (unique) and *timestamp* (descending order) field

## Run backup

1. *Optionally*: create *.env.local* (copy from *.env* file) and configure **ORFARCHIV_DB_URL** environment variable if
   your *MongoDB* is not running on **mongodb://localhost:27017**
2. `yarn install`
3. `yarn start`
