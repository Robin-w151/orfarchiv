import { persisted } from 'svelte-local-storage-store';
import type { Readable } from 'svelte/store';
import { STYLES_STORE_NAME } from '$lib/configs/client';

export type ColorScheme = 'light' | 'dark' | 'system';

export interface StylesStoreProps {
  colorScheme: ColorScheme;
}

export interface StylesStore extends Readable<StylesStoreProps>, Partial<StylesStoreProps> {
  setColorScheme: (colorScheme: ColorScheme) => void;
}

const initialState: StylesStoreProps = { colorScheme: 'system' };
const { subscribe, update } = persisted<StylesStoreProps>(STYLES_STORE_NAME, initialState);

function setColorScheme(colorScheme: ColorScheme) {
  update((styles) => ({ ...styles, colorScheme }));
}

export default { subscribe, setColorScheme } as StylesStore;
