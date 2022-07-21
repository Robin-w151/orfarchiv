#!/bin/bash

dbUrlFile=$1

if [ -n "$dbUrlFile" ]; then
  ORFARCHIV_DB_URL=$(cat "$dbUrlFile" 2> /dev/null)
  export ORFARCHIV_DB_URL
fi

timeout 60s yarn start
