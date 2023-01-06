import type { Settings } from '$lib/models/settings';
import { sources } from '$lib/models/settings';
import { writable } from 'svelte-local-storage-store';
import type { Readable } from 'svelte/store';
import { SETTINGS_STORE_NAME } from '$lib/configs/client';

export interface SettingsStore extends Readable<Settings>, Partial<Settings> {
  setFetchReadMoreContent: (_: boolean) => void;
  setSource: (_source: string, _included: boolean) => void;
}

const initialState = {
  fetchReadMoreContent: false,
  sources: sources.map((source) => source.key),
};
const { subscribe, update } = writable<Settings>(SETTINGS_STORE_NAME, initialState);

function setFetchReadMoreContent(fetchReadMoreContent: boolean): void {
  update((settings) => ({ ...settings, fetchReadMoreContent }));
}

function setSource(source: string, included: boolean): void {
  update((settings) => {
    let newSources = settings.sources ? [...settings.sources] : [];
    if (included) {
      if (!newSources.includes(source)) {
        newSources.push(source);
      }
    } else {
      newSources = newSources.filter((s) => s !== source);
    }
    return { ...settings, sources: newSources };
  });
}

export default { subscribe, setFetchReadMoreContent, setSource } as SettingsStore;
