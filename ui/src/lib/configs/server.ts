import { env } from '$env/dynamic/private';
import { createLogger, format, transports } from 'winston';

// Database
export const ORFARCHIV_DB_URL = env.ORFARCHIV_DB_URL?.trim() || 'mongodb://localhost';

// Logger
const { combine, json, timestamp } = format;
export const logger = createLogger({
  level: 'info',
  format: combine(timestamp(), json()),
  transports: [new transports.Console()],
});

// Query
export const NEWS_QUERY_PAGE_LIMIT = 100;
