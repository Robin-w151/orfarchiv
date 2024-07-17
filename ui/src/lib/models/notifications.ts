export interface OANotification {
  id: string;
  title: string;
  text: string;
  options?: OANotificationOptions;
  system?: boolean;
}

export interface OANotificationHandlers {
  onAccept?: () => void;
  onClose?: () => void;
}

export interface OANotificationOptions extends OANotificationHandlers {
  uniqueCategory?: symbol;
  replaceInCategory?: boolean;
  forceAppNotification?: boolean;
  requiredPathForFocus?: string;
}
