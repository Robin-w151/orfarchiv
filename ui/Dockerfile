FROM node:18-alpine AS build

WORKDIR /app/

COPY package.json yarn.lock .npmrc .yarnrc.yml /app/
COPY .yarn/ /app/.yarn/

RUN yarn install --immutable

COPY csp-config.js csp-script-hashes.js postcss.config.cjs svelte.config.js tailwind.config.cjs tsconfig.json vite.config.js /app/
COPY scripts/ /app/scripts/
COPY src/ /app/src/
COPY static/ /app/static/

ENV PUBLIC_APP_MODE=prod
ENV PUBLIC_ENABLE_ANALYTICS=false
ENV USE_ADAPTER_NODE=true

ARG ORFARCHIV_DB_URL="mongodb://localhost"
ENV ORFARCHIV_DB_URL="$ORFARCHIV_DB_URL"

RUN npx svelte-kit sync
RUN yarn fix:jsdom
RUN yarn build


FROM node:18-alpine AS deploy

WORKDIR /app/

COPY --from=build /app/build/ /app/
COPY --from=build /app/package.json /app/
COPY --from=build /app/node_modules/ /app/node_modules

COPY entrypoint.sh /app/

EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["./entrypoint.sh"]
