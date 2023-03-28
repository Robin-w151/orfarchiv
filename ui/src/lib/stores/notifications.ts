import { browser } from '$app/environment';
import type { Notification, NotificationOptions } from '$lib/models/notifications';
import { get, writable, type Readable } from 'svelte/store';
import { v4 as uuid } from 'uuid';

export interface NotificationsStore extends Readable<Array<Notification>> {
  notify: (text: string, options?: NotificationOptions) => void;
  remove: (id: string) => void;
}

const notifications = createNotificationsStore();

function createNotificationsStore(): NotificationsStore {
  const notifications = writable<Array<Notification>>([]);
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
