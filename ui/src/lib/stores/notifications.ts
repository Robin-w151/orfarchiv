import { browser } from '$app/environment';
import type { OANotification, OANotificationOptions } from '$lib/models/notifications';
import { createSystemNotification } from '$lib/utils/notifications';
import { get, writable, type Readable } from 'svelte/store';
import { v4 as uuid } from 'uuid';

export interface NotificationsStore extends Readable<Array<OANotification>> {
  notify: (title: string, text: string, options?: OANotificationOptions) => Promise<void>;
  accept: (id: string) => void;
  remove: (id: string) => void;
}

const notifications = createNotificationsStore();

function createNotificationsStore(): NotificationsStore {
  const notifications = writable<Array<OANotification>>([]);
  const { subscribe, set, update } = notifications;

  async function notify(title: string, text: string, options?: OANotificationOptions): Promise<void> {
    const id = uuid();
    const currentNotifications = get(notifications);
    const currentNotificationIndex = currentNotifications.findIndex(
      (notification) => notification.options?.uniqueCategory === options?.uniqueCategory,
    );

    if (options?.uniqueCategory && currentNotificationIndex > -1 && !options?.replaceInCategory) {
      return;
    }

    let createdSystemNotification;
    if (!options?.forceAppNotification) {
      createdSystemNotification = await createSystemNotification(id, title, text, options);
    }

    if (!createdSystemNotification) {
      const notification = { id, title, text, options, system: false };
      if (options?.uniqueCategory && options.replaceInCategory && currentNotificationIndex > -1) {
        const newNotifications = [...currentNotifications];
        newNotifications[currentNotificationIndex] = notification;
        set(newNotifications);
      } else {
        set([...currentNotifications, notification]);
      }
    }
  }

  function accept(id: string): void {
    update((notifications) =>
      notifications.filter((notification) => {
        if (notification.id === id) {
          notification.options?.onAccept?.();
          return false;
        } else {
          return true;
        }
      }),
    );
  }

  function remove(id: string): void {
    update((notifications) =>
      notifications.filter((notification) => {
        if (notification.id === id) {
          notification.options?.onClose?.();
          return false;
        } else {
          return true;
        }
      }),
    );
  }

  return { subscribe, notify, accept, remove };
}

if (browser) {
  console.log('notifications-store-initialized');
}

export default notifications;
