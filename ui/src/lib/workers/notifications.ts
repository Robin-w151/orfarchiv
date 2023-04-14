/// <reference lib="webworker" />

const notifications: Map<string, Notification> = new Map();

onmessage = async ({ data }: MessageEvent) => {
  const { id, action, payload } = data;

  switch (action) {
    case 'create': {
      const { title, text } = payload;
      const notification = create(id, title, text);
      notifications.set(id, notification);
      return;
    }
    case 'remove': {
      remove(id);
      return;
    }
  }
};

function create(id: string, title: string, text: string): Notification {
  const notification = new Notification(title, { body: text, icon: '/images/icon_any192.png' });
  notification.onclick = () => {
    postMessage({ id, action: 'click' });
    remove(id);
  };
  notification.onclose = () => {
    postMessage({ id, action: 'close' });
    remove(id);
  };
  return notification;
}

function remove(id: string): void {
  notifications.get(id)?.close();
  notifications.delete(id);
}

export {};
