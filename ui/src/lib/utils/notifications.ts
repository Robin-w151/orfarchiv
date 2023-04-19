import { browser } from '$app/environment';
import { NOTIFICATION_ACCEPT, NOTIFICATION_CLOSE } from '$lib/configs/client';
import type { OANotificationHandlers } from '$lib/models/notifications';

const notificationsHandlers: Map<string, OANotificationHandlers | undefined> = new Map();
const serviceWorker = getServiceWorker();
serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

export async function requestSystemNotificationPermission(): Promise<void> {
  if (!isNotificationAvailable()) {
    return;
  }

  if (Notification.permission === 'default') {
    console.log('request-system-notification-permission');
    await Notification.requestPermission();
  }
}

export async function createSystemNotification(
  id: string,
  title: string,
  text: string,
  handlers?: OANotificationHandlers,
): Promise<boolean> {
  if (isNotificationEnabled()) {
    const serviceWorker = await navigator.serviceWorker.ready;
    const options: NotificationOptions = {
      data: { id },
      body: text,
      icon: '/images/icon_any192.png',
      requireInteraction: true,
    };

    options.actions = [];
    if (handlers?.onAccept) {
      options.actions.push({
        action: NOTIFICATION_ACCEPT,
        title: 'Bestätigen',
      });
    }
    if (handlers?.onClose) {
      options.actions.push({
        action: NOTIFICATION_CLOSE,
        title: 'Schließen',
      });
    }

    serviceWorker.showNotification(title, options);
    notificationsHandlers.set(id, handlers);
    return true;
  }

  return false;
}

function isNotificationAvailable(): boolean {
  return browser && 'Notification' in window;
}

function isNotificationEnabled(): boolean {
  return isNotificationAvailable() && Notification.permission === 'granted';
}

function getServiceWorker(): ServiceWorkerContainer | undefined {
  if (browser) {
    return navigator.serviceWorker;
  }
}

function getAndRemoveHandlers(id: string): OANotificationHandlers | undefined {
  const handlers = notificationsHandlers.get(id);
  notificationsHandlers.delete(id);
  return handlers;
}

function handleServiceWorkerMessage({ data }: MessageEvent) {
  const { type, payload } = data;
  const { id } = payload;
  const handlers = getAndRemoveHandlers(id);
  switch (type) {
    case NOTIFICATION_ACCEPT: {
      handlers?.onAccept?.();
      break;
    }
    case NOTIFICATION_CLOSE: {
      handlers?.onClose?.();
      break;
    }
  }
}
