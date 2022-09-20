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
  from: now.minus({ year: 1 }).startOf('day'),
  to: now.endOf('day'),
};
const { subscribe, update } = writable<SearchFilter>(initialState);
const debouncedUpdate = debounce(update, 250, { leading: false, trailing: true });

function setTextFilter(textFilter?: string): void {
  debouncedUpdate((searchFilter) => ({ ...searchFilter, textFilter }));
}

function setFrom(from?: string): void {
  const newFrom = from ? DateTime.fromISO(from).startOf('day') : undefined;
  update((searchFilter) => ({ ...searchFilter, from: newFrom }));
}

function setTo(to?: string): void {
  const newTo = to ? DateTime.fromISO(to).endOf('day') : undefined;
  update((searchFilter) => ({ ...searchFilter, to: newTo }));
}

export default { subscribe, setTextFilter, setFrom, setTo } as SearchFilterStore;
