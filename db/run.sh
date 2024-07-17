#!/bin/bash -e

scriptDir=$(dirname "$0")
dbUrlFile="$1"
backupDirFile="$2"

if [ -n "$dbUrlFile" ]; then
  ORFARCHIV_DB_URL=$(cat "$dbUrlFile" 2> /dev/null)
  export ORFARCHIV_DB_URL
fi

if [ -n "$backupDirFile" ]; then
  ORFARCHIV_BACKUP_DIR=$(cat "$backupDirFile" 2> /dev/null)
  export ORFARCHIV_BACKUP_DIR
fi

cd "$scriptDir"
timeout 60s npm run backup
