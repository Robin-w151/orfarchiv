import { browser } from '$app/environment';

export async function requestSystemNotificationPermission(): Promise<void> {
  if (!isNotificationAvailable()) {
    return;
  }

  if (Notification.permission === 'default') {
    console.log('request-system-notification-permission');
    await Notification.requestPermission();
  }
}

export function createSystemNotification(
  title: string,
  text: string,
  onClick: () => void,
  onClose: () => void,
): Notification | undefined {
  if (isNotificationEnabled()) {
    const notification = new Notification(title, { body: text, icon: '/images/icon192.png' });
    notification.onclick = onClick;
    notification.onclose = onClose;
    return notification;
  }
}

export function removeSystemNotification(notification?: Notification): void {
  notification?.close();
}

function isNotificationAvailable(): boolean {
  return browser && 'Notification' in window;
}

function isNotificationEnabled(): boolean {
  return isNotificationAvailable() && Notification.permission === 'granted';
}
