export function isOrfStoryUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return !!url.match(/^https:\/\/\w+\.orf\.at\/stories\/\d+/i);
}
