export interface OANotification {
  id: string;
  title: string;
  text: string;
  options?: OANotificationOptions;
  handle?: Notification;
}

export interface OANotificationOptions {
  uniqueCategory?: symbol;
  onAccept?: () => void;
  onClose?: () => void;
}
