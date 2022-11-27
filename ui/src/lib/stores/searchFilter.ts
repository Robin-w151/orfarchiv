import type { DateFilter, SearchFilter } from '$lib/models/searchRequest';
import debounce from 'lodash.debounce';
import { DateTime, type DurationLike } from 'luxon';
import { writable, type Readable } from 'svelte/store';

export interface SearchFilterStoreProps extends Partial<SearchFilter> {
  tempSearchFilter: { dateFilter?: DateFilter };
}

export interface SearchFilterStore extends Readable<SearchFilterStoreProps>, Partial<SearchFilterStoreProps> {
  setTextFilter: (textFilter: string | undefined) => void;
  setFrom: (fromDate: string | undefined) => void;
  setTo: (toDate: string | undefined) => void;
  applyTempSearchFilter: () => void;
  resetDateFilter: () => void;
  selectDateFilterToday: () => void;
  selectDateFilterLastWeek: () => void;
  selectDateFilterLastMonth: () => void;
  selectDateFilterLastYear: () => void;
}

const from = undefined;
const to = undefined;
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

function resetDateFilter(): void {
  update((searchFilter) => ({
    ...searchFilter,
    dateFilter: {},
    tempSearchFilter: { ...searchFilter.tempSearchFilter, dateFilter: {} },
  }));
}

function selectDateFilterToday(): void {
  const [from, to] = dateRangeFromNow({});
  update((searchFilter) => ({
    ...searchFilter,
    tempSearchFilter: { ...searchFilter.tempSearchFilter, dateFilter: { from, to } },
  }));
}

function selectDateFilterLastWeek(): void {
  const [from, to] = dateRangeFromNow({ weeks: 1 });
  update((searchFilter) => ({
    ...searchFilter,
    tempSearchFilter: { ...searchFilter.tempSearchFilter, dateFilter: { from, to } },
  }));
}

function selectDateFilterLastMonth(): void {
  const [from, to] = dateRangeFromNow({ months: 1 });
  update((searchFilter) => ({
    ...searchFilter,
    tempSearchFilter: { ...searchFilter.tempSearchFilter, dateFilter: { from, to } },
  }));
}

function selectDateFilterLastYear(): void {
  const [from, to] = dateRangeFromNow({ years: 1 });
  update((searchFilter) => ({
    ...searchFilter,
    tempSearchFilter: { ...searchFilter.tempSearchFilter, dateFilter: { from, to } },
  }));
}

function dateRangeFromNow(duration: DurationLike): [DateTime, DateTime] {
  const now = DateTime.now();
  const from = now.minus(duration).startOf('day');
  const to = now.endOf('day');
  return [from, to];
}

export default {
  subscribe,
  setTextFilter,
  setFrom,
  setTo,
  applyTempSearchFilter,
  resetDateFilter,
  selectDateFilterToday,
  selectDateFilterLastWeek,
  selectDateFilterLastMonth,
  selectDateFilterLastYear,
} as SearchFilterStore;
