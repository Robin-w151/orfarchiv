export interface OANotification {
  id: string;
  title: string;
  text: string;
  options?: OANotificationOptions;
  system?: boolean;
}

export interface OANotificationOptions {
  uniqueCategory?: symbol;
  onAccept?: () => void;
  onClose?: () => void;
}
