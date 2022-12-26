export function isOrfStoryUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return !!url.match(/^https:\/\/.*orf\.at\/stories\/\d+/i);
}
