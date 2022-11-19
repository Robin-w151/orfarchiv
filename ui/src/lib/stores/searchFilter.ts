import type { DateFilter, SearchFilter } from '$lib/models/searchRequest';
import debounce from 'lodash.debounce';
import { DateTime } from 'luxon';
import { writable, type Readable } from 'svelte/store';

export interface SearchFilterStoreProps extends Partial<SearchFilter> {
  tempSearchFilter: { dateFilter?: DateFilter };
}

export interface SearchFilterStore extends Readable<SearchFilterStoreProps>, Partial<SearchFilterStoreProps> {
  setTextFilter: (textFilter: string | undefined) => void;
  setFrom: (fromDate: string | undefined) => void;
  setTo: (toDate: string | undefined) => void;
  applyTempSearchFilter: () => void;
}

const now = DateTime.now();
const from = now.minus({ year: 1 }).startOf('day');
const to = now.endOf('day');
const initialState = {
  textFilter: '',
  dateFilter: {
    from,
    to,
  },
  tempSearchFilter: {
    dateFilter: {
      from,
      to,
    },
  },
};
const { subscribe, update } = writable<SearchFilterStoreProps>(initialState);
const debouncedUpdate = debounce(update, 250, { leading: false, trailing: true });

function setTextFilter(textFilter?: string): void {
  debouncedUpdate((searchFilter) => ({ ...searchFilter, textFilter }));
}

function setFrom(from?: string): void {
  const newFrom = from ? DateTime.fromISO(from).startOf('day') : undefined;
  update((searchFilter) => {
    const to = searchFilter.tempSearchFilter.dateFilter?.to;
    const newTo = !to || !newFrom || newFrom <= to ? to : newFrom;
    return { ...searchFilter, tempSearchFilter: { dateFilter: { from: newFrom, to: newTo } } };
  });
}

function setTo(to?: string): void {
  const newTo = to ? DateTime.fromISO(to).endOf('day') : undefined;
  update((searchFilter) => {
    const from = searchFilter.tempSearchFilter.dateFilter?.from;
    const newFrom = !from || !newTo || from <= newTo ? from : newTo;
    return { ...searchFilter, tempSearchFilter: { dateFilter: { from: newFrom, to: newTo } } };
  });
}

function applyTempSearchFilter(): void {
  update((searchFilter) => ({ ...searchFilter, ...searchFilter.tempSearchFilter }));
}

export default {
  subscribe,
  setTextFilter,
  setFrom,
  setTo,
  applyTempSearchFilter,
} as SearchFilterStore;
