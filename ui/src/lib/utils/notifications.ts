import { browser } from '$app/environment';

let notificationsWorker: Worker | null = null;

export async function requestSystemNotificationPermission(): Promise<void> {
  if (!isNotificationAvailable()) {
    return;
  }

  if (Notification.permission === 'default') {
    console.log('request-system-notification-permission');
    await Notification.requestPermission();
  }
}

export function createSystemNotification(id: string, title: string, text: string): boolean {
  if (isNotificationEnabled()) {
    postMessage({ id, action: 'create', payload: { title, text } });
    return true;
  }

  return false;
}

export function removeSystemNotification(id?: string): void {
  if (id) {
    postMessage({ id, action: 'remove' });
  }
}

function isNotificationAvailable(): boolean {
  return browser && 'Notification' in window;
}

function isNotificationEnabled(): boolean {
  return isNotificationAvailable() && Notification.permission === 'granted';
}

async function postMessage(data: any): Promise<void> {
  if (!notificationsWorker) {
    const Worker = await import('$lib/workers/notifications?worker');
    notificationsWorker = new Worker.default();
  }

  notificationsWorker.postMessage(data);
}
