import { env } from '$env/dynamic/private';

// Database
export const ORFARCHIV_DB_URL = env.ORFARCHIV_DB_URL?.trim() || 'mongodb://localhost';

// Query
export const NEWS_QUERY_PAGE_LIMIT = 100;
