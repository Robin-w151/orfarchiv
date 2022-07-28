# ORF Archiv DB

ORF Archiv DB is a utility package used for local development. It contains a simple *docker-compose* file to quickly
start a local *MongoDB* instance. Additionally, it also starts a *mongo-express* server to inspect your *MongoDB* with
a web UI.

## Run

1. docker-compose up -d
2. Visit http://localhost:3002
3. Create *orfarchiv* database
4. Create *news* collection in the *orfarchiv* database
5. Create an index for *id* (unique) and *timestamp* (descending order) field
