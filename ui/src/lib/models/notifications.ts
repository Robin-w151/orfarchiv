export interface Notification {
  id: string;
  text: string;
  options?: NotificationOptions;
}

export interface NotificationOptions {
  uniqueCategory?: symbol;
  action?: () => void;
}
