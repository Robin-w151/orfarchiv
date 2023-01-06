import { env } from '$env/dynamic/private';
import { createLogger, format, transports } from 'winston';

// Database
export const ORFARCHIV_DB_URL = env.ORFARCHIV_DB_URL?.trim() || 'mongodb://localhost';

// Logger
const { align, colorize, combine, timestamp, printf } = format;
export const logger = createLogger({
  level: 'info',
  format: combine(
    align(),
    colorize(),
    timestamp(),
    printf((log) => `${log.timestamp} ${log.level} ${log.message}`),
  ),
  transports: [new transports.Console()],
});

// Query
export const NEWS_QUERY_PAGE_LIMIT = 100;
