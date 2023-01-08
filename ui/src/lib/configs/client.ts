// Context keys
export const CTX_STORE = Symbol('store');

// Endpoints
export const WEB_VITALS_URL = '/api/vitals';
export const API_NEWS_SEARCH_URL = (searchParams: string) => `/api/news/search?${searchParams}`;
export const API_NEWS_CONTENT_URL = (searchParams: string) => `/api/news/content?${searchParams}`;

// IndexedDB
export const BOOKMARKS_STORE_NAME = 'bookmarks';

// LocalStorage
export const SETTINGS_STORE_NAME = 'settings';
export const STYLES_STORE_NAME = 'styles';

// DateTime
export const DATETIME_FORMAT = 'dd.MM.yyyy, HH:mm';

// Story
export const STORY_CONTENT_FETCH_MAX_RETRIES = 5;
export const STORY_CONTENT_READ_MORE_REGEXPS = [/mehr\s+dazu\s+in/i, /lesen\s+sie\s+mehr/i];

// URLs
export const URL_ORF_STORY_REGEXP = /^https:\/\/.*orf\.at\/(.+\/)?stories\/\d+/i;
