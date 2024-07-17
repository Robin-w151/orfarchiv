#!/bin/bash -e

scriptDir=$(dirname "$0")
dbUrlFile="$1"

if [ -n "$dbUrlFile" ]; then
  ORFARCHIV_DB_URL=$(cat "$dbUrlFile" 2> /dev/null)
  export ORFARCHIV_DB_URL
fi

cd "$scriptDir"
timeout 60s npm start
