import type { Writable } from 'svelte/store';
import { writable } from 'svelte-local-storage-store';

export type ColorScheme = 'light' | 'dark' | 'system';

export interface StylesStoreProps {
  colorScheme: ColorScheme;
}

export interface StylesStore extends StylesStoreProps {
  subscribe: Writable<StylesStoreProps>['subscribe'];
  setColorScheme: (colorScheme: ColorScheme) => void;
}

const initialState: StylesStoreProps = { colorScheme: 'system' };
const { subscribe, update } = writable<StylesStoreProps>('styles', initialState);

function setColorScheme(colorScheme: ColorScheme) {
  update((styles) => ({ ...styles, colorScheme }));
}

export default { subscribe, setColorScheme } as StylesStore;
