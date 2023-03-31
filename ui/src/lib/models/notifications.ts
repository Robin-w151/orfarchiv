export interface Notification {
  id: string;
  text: string;
  options?: NotificationOptions;
}

export interface NotificationOptions {
  uniqueCategory?: symbol;
  onAccept?: () => void;
  onClose?: () => void;
}
