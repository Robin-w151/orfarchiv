import { URL_ORF_STORY_REGEXP } from '$lib/configs/server';

export function isOrfStoryUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return !!RegExp(URL_ORF_STORY_REGEXP).exec(url);
}
