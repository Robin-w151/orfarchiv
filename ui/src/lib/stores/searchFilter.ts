import type { SearchFilter } from '$lib/models/searchRequest';
import { type Writable, writable } from 'svelte/store';
import debounce from 'lodash.debounce';
import { DateTime } from 'luxon';

export interface SearchFilterStore extends Partial<SearchFilter> {
  subscribe: Writable<SearchFilter>['subscribe'];
  setTextFilter: (textFilter: string | undefined) => void;
  setFrom: (fromDate: string | undefined) => void;
  setTo: (toDate: string | undefined) => void;
}

const now = DateTime.now();
const initialState = {
  textFilter: '',
  from: now.minus({ year: 1 }).toISODate(),
  to: now.toISODate(),
};
const { subscribe, update } = writable<SearchFilter>(initialState);
const debouncedUpdate = debounce(update, 250, { leading: false, trailing: true });

function setTextFilter(textFilter?: string): void {
  debouncedUpdate((searchFilter) => ({ ...searchFilter, textFilter }));
}

function setFrom(from?: string): void {
  update((searchFilter) => ({ ...searchFilter, from }));
}

function setTo(to?: string): void {
  update((searchFilter) => ({ ...searchFilter, to }));
}

export default { subscribe, setTextFilter, setFrom, setTo } as SearchFilterStore;
