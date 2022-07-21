#!/bin/bash

dbUrlFile=$1
if [ -z "$dbUrlFile" ]; then
    echo 'usage: ./run <DB-URL-FILE>'
    exit 1
fi

ORFARCHIV_DB_URL=$(cat "$dbUrlFile" 2> /dev/null)
export ORFARCHIV_DB_URL

timeout 60s yarn start
