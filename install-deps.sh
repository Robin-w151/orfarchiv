#!/bin/bash

modules=(db scraper ui)

for module in "${modules[@]}"; do
    cd "${module}" || exit 1
    echo "Installing dependencies for ${module}..."
    aikido-npm install
    echo "Done installing dependencies for ${module}."
    cd .. || exit 1
done
