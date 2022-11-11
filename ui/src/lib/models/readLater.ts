import type { PageKey } from './pageKey';
import type { Story } from './story';

export interface ReadLater {
  stories: Array<Story>;
  nextKey?: PageKey | null;
}
