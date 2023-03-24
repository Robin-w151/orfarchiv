export interface Notification {
  id: string;
  text: string;
  action?: () => void;
}
