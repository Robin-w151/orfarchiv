import type { Writable } from 'svelte/store';
import type { Settings } from '../models/settings';
import { writable } from 'svelte-local-storage-store';

interface SettingsStore extends Partial<Settings> {
  subscribe: Writable<Settings>['subscribe'];
  setOpenLinksInNewTab: (_: boolean) => void;
  setUseCategoryColorPalette: (_: boolean) => void;
}

const initialState = { openLinksInNewTab: true, useCategoryColorPalette: true };
const { subscribe, update } = writable<Settings>('settings', initialState);

function setOpenLinksInNewTab(openLinksInNewTab: boolean): void {
  update((settings) => ({ ...settings, openLinksInNewTab }));
}

function setUseCategoryColorPalette(useCategoryColorPalette: boolean): void {
  update((settings) => ({ ...settings, useCategoryColorPalette }));
}

export default { subscribe, setOpenLinksInNewTab, setUseCategoryColorPalette } as SettingsStore;
