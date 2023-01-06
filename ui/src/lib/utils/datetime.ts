import { DateTime } from 'luxon';
import { DATETIME_FORMAT } from '$lib/configs/client';

export function formatTimestamp(timestamp: string): string {
  const datetime = DateTime.fromISO(timestamp);
  return formatTimestampWithDefaultTimezone(datetime);
}

function formatTimestampWithDefaultTimezone(timestamp: DateTime): string {
  return timestamp.toFormat(DATETIME_FORMAT);
}
