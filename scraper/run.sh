#!/bin/bash

dbUrlFile=$1
if [ -z "$dbUrlFile" ]; then
    echo 'usage: ./run <DB-URL-FILE>'
    exit 1
fi

DB_URL=$(cat "$dbUrlFile" 2> /dev/null)
export DB_URL

yarn start
