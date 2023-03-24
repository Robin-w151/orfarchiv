import type { Notification } from '$lib/models/notifications';
import { writable, type Readable } from 'svelte/store';
import { v4 as uuid } from 'uuid';

export interface NotificationsStore extends Readable<Array<Notification>> {
  notify: (text: string, action?: () => void) => void;
  remove: (id: string) => void;
}

const notifications = createNotificationsStore();

function createNotificationsStore(): NotificationsStore {
  const { subscribe, update } = writable<Array<Notification>>([]);

  function notify(text: string, action?: () => void): void {
    const id = uuid();
    const notification = { id, text, action };
    update((notifcations) => [...notifcations, notification]);
  }

  function remove(id: string): void {
    update((notifications) => notifications.filter((notification) => notification.id !== id));
  }

  return { subscribe, notify, remove };
}

export default notifications as NotificationsStore;
