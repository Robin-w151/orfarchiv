#!/usr/bin/env sh

file_env() {
  name="$1"
  path=$(printenv "${name}_FILE")
  if [ -f "$path" ]; then
    value=$(cat "$path")
    export "$name"="$value"
  fi
}

file_env ORFARCHIV_DB_URL

node --experimental-specifier-resolution=node .
