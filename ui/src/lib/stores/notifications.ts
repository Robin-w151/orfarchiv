import { browser } from '$app/environment';
import type { Notification as INotification, NotificationOptions } from '$lib/models/notifications';
import { get, writable, type Readable } from 'svelte/store';
import { v4 as uuid } from 'uuid';

export interface NotificationsStore extends Readable<Array<INotification>> {
  notify: (text: string, options?: NotificationOptions) => void;
  remove: (id: string) => void;
}

export async function requestSystemNotificationPermission(): Promise<void> {
  if (!browser || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'default') {
    console.log('request-system-notification-permission');
    await Notification.requestPermission();
  }
}

const notifications = createNotificationsStore();

function createNotificationsStore(): NotificationsStore {
  const notifications = writable<Array<INotification>>([]);
  const { subscribe, set, update } = notifications;

  function notify(text: string, options?: NotificationOptions): void {
    const id = uuid();
    const currentNotifications = get(notifications);
    if (
      options?.uniqueCategory &&
      currentNotifications.find((notification) => notification.options?.uniqueCategory === options.uniqueCategory)
    ) {
      return;
    }

    const notification = { id, text, options };
    set([...currentNotifications, notification]);
  }

  function remove(id: string): void {
    update((notifications) => notifications.filter((notification) => notification.id !== id));
  }

  return { subscribe, notify, remove };
}

if (browser) {
  console.log('notifications-store-initialized');
}

export default notifications as NotificationsStore;
