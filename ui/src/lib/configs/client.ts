// Context keys
export const CTX_STORE = Symbol('store');

// Endpoints
export const WEB_VITALS_URL = '/api/vitals';
export const API_NEWS_SEARCH_URL = (searchParams: string) => `/api/news/search?${searchParams}`;
export const API_NEWS_SEARCH_UPDATES_URL = (searchParams: string) => `/api/news/search/updates?${searchParams}`;
export const API_NEWS_CONTENT_URL = (searchParams: string) => `/api/news/content?${searchParams}`;

// IndexedDB
export const BOOKMARKS_STORE_NAME = 'bookmarks';

// LocalStorage
export const SETTINGS_STORE_NAME = 'settings';
export const STYLES_STORE_NAME = 'styles';

// DateTime
export const DATETIME_FORMAT = 'dd.MM.yyyy, HH:mm';

// Notifications
export const NOTIFICATION_NEWS_UPDATES_AVAILABLE = Symbol('news-update-available');

// Notification Actions
export const NOTIFICATION_ACCEPT = 'NOTIFICATION_ACCEPT';
export const NOTIFICATION_CLOSE = 'NOTIFICATION_CLOSE';

// News
export const NEWS_CHECK_UPDATES_INITIAL_INTERVAL_IN_MS = 10_800_000;
export const NEWS_CHECK_UPDATES_INTERVAL_IN_MS = 1_800_000;

// Story
export const STORY_CONTENT_FETCH_MAX_RETRIES = 5;
