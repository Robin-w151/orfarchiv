import type { Writable } from 'svelte/store';
import { writable } from 'svelte-local-storage-store';

export type ColorScheme = 'light' | 'dark';

export interface StylesStoreProps {
  colorScheme: ColorScheme;
}

export interface StylesStore extends StylesStoreProps {
  subscribe: Writable<StylesStoreProps>['subscribe'];
  toggleColorScheme: () => void;
}

const initialState: StylesStoreProps = { colorScheme: 'light' };
const { subscribe, update } = writable<StylesStoreProps>('styles', initialState);

function toggleColorScheme() {
  update((styles) => ({ ...styles, colorScheme: styles.colorScheme === 'light' ? 'dark' : 'light' }));
}

export default { subscribe, toggleColorScheme } as StylesStore;
