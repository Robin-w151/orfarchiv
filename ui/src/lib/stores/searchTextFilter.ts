import type { SearchTextFilter } from '$lib/models/searchRequest';
import { type Writable, writable } from 'svelte/store';
import debounce from 'lodash.debounce';

export interface SearchTextFilterStore extends Partial<SearchTextFilter> {
  subscribe: Writable<SearchTextFilter>['subscribe'];
  setSearchTextFilter: (_: string | undefined) => void;
}

const initialState = { textFilter: '' };
const { subscribe, set } = writable<SearchTextFilter>(initialState);
const debouncedSet = debounce(set, 250, { leading: false, trailing: true });

function setSearchTextFilter(textFilter?: string): void {
  debouncedSet({ textFilter });
}

export default { subscribe, setSearchTextFilter } as SearchTextFilterStore;
