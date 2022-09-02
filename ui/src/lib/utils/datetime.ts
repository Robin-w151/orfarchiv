import { DateTime } from 'luxon';

const FORMAT = 'dd.MM.yyyy, HH:mm';

export function formatTimestamp(timestamp: string): string {
  const datetime = DateTime.fromISO(timestamp);
  return formatTimestampWithDefaultTimezone(datetime);
}

function formatTimestampWithDefaultTimezone(timestamp: DateTime): string {
  return timestamp.toFormat(FORMAT);
}
