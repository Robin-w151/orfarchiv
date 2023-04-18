import { browser } from '$app/environment';
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
    serviceWorker.showNotification(title, {
      data: { id },
      body: text,
      icon: '/images/icon_any192.png',
      requireInteraction: true,
    });
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

function handleServiceWorkerMessage({ data }: MessageEvent) {
  const { type, payload } = data;
  const { id } = payload;
  switch (type) {
    case 'NOTIFICATION_CLICK': {
      notificationsHandlers.get(id)?.onAccept?.();
      notificationsHandlers.delete(id);
      break;
    }
    case 'NOTIFICATION_CLOSE': {
      notificationsHandlers.get(id)?.onClose?.();
      notificationsHandlers.delete(id);
      break;
    }
  }
}
