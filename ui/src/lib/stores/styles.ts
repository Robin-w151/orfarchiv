import { writable } from 'svelte-local-storage-store';
import type { Readable } from 'svelte/store';

export type ColorScheme = 'light' | 'dark' | 'system';

export interface StylesStoreProps {
  colorScheme: ColorScheme;
}

export interface StylesStore extends Readable<StylesStoreProps>, Partial<StylesStoreProps> {
  setColorScheme: (colorScheme: ColorScheme) => void;
}

const initialState: StylesStoreProps = { colorScheme: 'system' };
const { subscribe, update } = writable<StylesStoreProps>('styles', initialState);

function setColorScheme(colorScheme: ColorScheme) {
  update((styles) => ({ ...styles, colorScheme }));
}

export default { subscribe, setColorScheme } as StylesStore;
