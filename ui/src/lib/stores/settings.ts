import type { Writable } from 'svelte/store';
import type { Settings } from '../models/settings';
import { writable } from 'svelte/store';
import { identity } from 'svelte/internal';

interface SettingsStore extends Partial<Settings> {
  subscribe: Writable<Settings>['subscribe'];
  setOpenLinksInNewTab: (_: boolean) => void;
  setUseCategoryColorPalette: (_: boolean) => void;
}

const initialState = { openLinksInNewTab: true, useCategoryColorPalette: true };
const storedState = fetchFromStorage();
const { subscribe, update } = writable<Settings>(storedState ?? initialState);
const storageKey = 'settings';

function fetchFromStorage(): Settings | null {
  try {
    const serializedSettings = localStorage.settings;
    return serializedSettings ? JSON.parse(serializedSettings) : null;
  } catch (_) {
    console.warn('Failed to deserialize settings!');
    return null;
  }
}

function updateAndPersist(updater: (_: Settings) => Settings): void {
  update((settings) => {
    const newSettings = updater(settings);
    if (newSettings) {
      localStorage.setItem(storageKey, JSON.stringify(newSettings));
    } else {
      localStorage.removeItem(storageKey);
    }
    return newSettings;
  });
}

function setOpenLinksInNewTab(openLinksInNewTab: boolean): void {
  updateAndPersist((settings) => ({ ...settings, openLinksInNewTab }));
}

function setUseCategoryColorPalette(useCategoryColorPalette: boolean): void {
  updateAndPersist((settings) => ({ ...settings, useCategoryColorPalette }));
}

if (!storedState) {
  updateAndPersist(identity);
}

export default { subscribe, setOpenLinksInNewTab, setUseCategoryColorPalette } as SettingsStore;
