import { URL_ORF_STORY_REGEXP } from '$lib/configs/client';

export function isOrfStoryUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return !!url.match(URL_ORF_STORY_REGEXP);
}
