export function isNavigatorWithConnection(
  navigator: unknown,
): navigator is Navigator & { connection: { effectiveType: string } } {
  return !!(
    navigator &&
    typeof navigator === 'object' &&
    'connection' in navigator &&
    navigator.connection &&
    typeof navigator.connection === 'object' &&
    'effectiveType' in navigator.connection
  );
}
