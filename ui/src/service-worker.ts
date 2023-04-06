/// <reference types="@sveltejs/kit" lib="webworker" />
import { build, files, prerendered, version } from '$service-worker';
import { json } from '@sveltejs/kit';
import type { RouteHandler, RouteMatchCallback, WorkboxPlugin } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { type Route, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

interface RouteConfig {
  capture: string | RegExp | RouteMatchCallback | Route;
  handler: RouteHandler;
}

const precacheConfig = generatePrecacheConfig();
precacheAndRoute(precacheConfig);

const routeConfig = generateRouteConfig();
routeConfig.forEach(({ capture, handler }) => registerRoute(capture, handler));

function generatePrecacheConfig(): Array<string | PrecacheEntry> {
  const withRevision = (url: string) => ({ url, revision: version });
  const withoutRevision = (url: string) => ({ url, revision: null });
  return [...build.map(withoutRevision), ...files.map(withRevision), ...prerendered.map(withRevision)];
}

function generateRouteConfig(): Array<RouteConfig> {
  return [
    {
      capture: /\/api\/news\/search[^/]*/,
      handler: new NetworkFirst({
        cacheName: 'api-news-search',
        plugins: [new ExpirationPlugin({ maxEntries: 64 }), fallbackResponsePlugin({ stories: [] })],
      }),
    },
    {
      capture: /\/api\/news\/content/,
      handler: new NetworkFirst({
        cacheName: 'api-news-content',
        plugins: [new ExpirationPlugin({ maxEntries: 256 })],
      }),
    },
  ];
}

function fallbackResponsePlugin(data: any): WorkboxPlugin {
  return {
    handlerDidError: async () => json(data),
  };
}
