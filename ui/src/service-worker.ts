/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, prerendered, version } from '$service-worker';
import { json } from '@sveltejs/kit';
import type { RouteHandler, RouteMatchCallback, WorkboxPlugin } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { type Route, registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { NOTIFICATION_ACCEPT, NOTIFICATION_CLOSE } from './lib/configs/client';

interface RouteConfig {
  capture: string | RegExp | RouteMatchCallback | Route;
  handler: RouteHandler;
}

declare const self: ServiceWorkerGlobalScope;

const NETWORK_TIMEOUT_IN_SEC = 5;

const precacheConfig = generatePrecacheConfig();
precacheAndRoute(precacheConfig);

const routeConfig = generateRouteConfig();
routeConfig.forEach(({ capture, handler }) => registerRoute(capture, handler));

const notificationsClicked: Set<string> = new Set();
self.onnotificationclick = handleNotificationClick;
self.onnotificationclose = handleNotificationClose;

function generatePrecacheConfig(): Array<string | PrecacheEntry> {
  const withRevision = (url: string) => ({ url, revision: version });
  const withoutRevision = (url: string) => ({ url, revision: null });
  return [...build.map(withoutRevision), ...files.map(withRevision), ...prerendered.map(withRevision)];
}

function generateRouteConfig(): Array<RouteConfig> {
  return [
    {
      capture: /\/api\/news\/search(\?.*)?$/,
      handler: new NetworkFirst({
        cacheName: 'api-news-search',
        plugins: [new ExpirationPlugin({ maxEntries: 64 }), fallbackResponsePlugin({ stories: [] })],
        networkTimeoutSeconds: NETWORK_TIMEOUT_IN_SEC,
      }),
    },
    {
      capture: /\/api\/news\/search\/updates(\?.*)?$/,
      handler: new NetworkOnly({
        plugins: [fallbackResponsePlugin({ updateAvailable: false })],
        networkTimeoutSeconds: NETWORK_TIMEOUT_IN_SEC,
      }),
    },
    {
      capture: /\/api\/news\/content(\?.*)?$/,
      handler: new NetworkFirst({
        cacheName: 'api-news-content',
        plugins: [new ExpirationPlugin({ maxEntries: 256 })],
        networkTimeoutSeconds: NETWORK_TIMEOUT_IN_SEC,
      }),
    },
  ];
}

function fallbackResponsePlugin<T>(data: T): WorkboxPlugin {
  return {
    handlerDidError: async () => json(data),
  };
}

function getClients(): Promise<readonly Client[]> {
  return self.clients.matchAll();
}

async function focusClient(clients: readonly Client[]): Promise<void> {
  for (const client of clients) {
    if ('focus' in client && typeof client.focus === 'function') {
      return client.focus();
    }
  }

  if ('openWindow' in clients && typeof clients.openWindow === 'function') {
    return clients.openWindow('/');
  }
}

async function notifyClientsAndFocus(id: string, type: string) {
  const clients = await getClients();

  if (type !== NOTIFICATION_CLOSE) {
    await focusClient(clients);
  }

  clients?.forEach((client) => client.postMessage({ type, payload: { id } }));
}

async function handleNotificationClick(event: NotificationEvent) {
  const id = event.notification.data.id;
  const type = event.action || NOTIFICATION_ACCEPT;
  notificationsClicked.add(id);

  event.notification.close();
  event.waitUntil(notifyClientsAndFocus(id, type));
}

async function handleNotificationClose(event: NotificationEvent) {
  const id = event.notification.data.id;
  const type = NOTIFICATION_CLOSE;
  if (notificationsClicked.has(id)) {
    notificationsClicked.delete(id);
    return;
  }

  event.waitUntil(notifyClientsAndFocus(id, type));
}
