import { DateTime } from 'luxon';

const FORMAT = 'dd.MM.yyyy, HH:mm';
const FALLBACK_ZONE = 'Europe/Vienna';

export function formatTimestamp(timestamp: string, browser: boolean): string {
  const datetime = DateTime.fromISO(timestamp);
  if (browser) {
    return formatTimestampWithDefaultTimezone(datetime);
  } else {
    return formatTimestampWithFallbackTimezone(datetime);
  }
}

function formatTimestampWithDefaultTimezone(timestamp: DateTime): string {
  return timestamp.toFormat(FORMAT);
}

function formatTimestampWithFallbackTimezone(timestamp: DateTime): string {
  return timestamp.setZone(FALLBACK_ZONE).toFormat(FORMAT);
}
