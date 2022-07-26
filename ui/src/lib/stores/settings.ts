import type { Writable } from 'svelte/store';
import type { Settings } from '../models/settings';
import { writable } from 'svelte-local-storage-store';
import { sources } from '../models/settings';

export interface SettingsStore extends Partial<Settings> {
  subscribe: Writable<Settings>['subscribe'];
  setOpenLinksInNewTab: (_: boolean) => void;
  setUseCategoryColorPalette: (_: boolean) => void;
  setSource: (_source: string, _included: boolean) => void;
}

const initialState = {
  openLinksInNewTab: true,
  useCategoryColorPalette: false,
  sources: sources.map((source) => source.key),
};
const { subscribe, update } = writable<Settings>('settings', initialState);

function setOpenLinksInNewTab(openLinksInNewTab: boolean): void {
  update((settings) => ({ ...settings, openLinksInNewTab }));
}

function setUseCategoryColorPalette(useCategoryColorPalette: boolean): void {
  update((settings) => ({ ...settings, useCategoryColorPalette }));
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

export default { subscribe, setOpenLinksInNewTab, setUseCategoryColorPalette, setSource } as SettingsStore;
