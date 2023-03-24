import type { Settings } from '$lib/models/settings';
import { sources } from '$lib/models/settings';
import { persisted } from 'svelte-local-storage-store';
import type { Readable } from 'svelte/store';
import { SETTINGS_STORE_NAME } from '$lib/configs/client';
import { browser } from '$app/environment';

export interface SettingsStore extends Readable<Settings>, Partial<Settings> {
  setFetchReadMoreContent: (fetchReadMoreContent: boolean) => void;
  setCheckNewsUpdates: (checkNewsUpdates: boolean) => void;
  setSource: (source: string, included: boolean) => void;
}

const initialState = {
  fetchReadMoreContent: false,
  checkNewsUpdates: false,
  sources: sources.map((source) => source.key),
};
const { subscribe, update } = persisted<Settings>(SETTINGS_STORE_NAME, initialState);

function setFetchReadMoreContent(fetchReadMoreContent: boolean): void {
  update((settings) => ({ ...settings, fetchReadMoreContent }));
}

function setCheckNewsUpdates(checkNewsUpdates: boolean): void {
  update((settings) => ({ ...settings, checkNewsUpdates }));
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

if (browser) {
  console.log('settings-store-initialized');
}

export default { subscribe, setFetchReadMoreContent, setCheckNewsUpdates, setSource } as SettingsStore;
