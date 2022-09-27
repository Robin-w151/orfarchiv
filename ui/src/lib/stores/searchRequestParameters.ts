import type { SearchRequestParameters } from '$lib/models/searchRequest';
import searchFilter, { type SearchFilterStoreProps } from './searchFilter';
import settings from './settings';
import { derived, type Readable, writable } from 'svelte/store';

export interface SearchRequestParametersStore extends Partial<SearchRequestParameters> {
  subscribe: Readable<SearchRequestParameters>['subscribe'];
}

function searchFitterStorePropsNotEqual(p1: SearchFilterStoreProps, p2: SearchFilterStoreProps): boolean {
  return (
    p1.textFilter !== p2.textFilter ||
    p1.dateFilter?.from !== p2.dateFilter?.from ||
    p1.dateFilter?.to !== p2.dateFilter?.to
  );
}

const searchFilterChanges = writable<SearchFilterStoreProps>();
let oldSearchFilterStoreProps: SearchFilterStoreProps;
searchFilter.subscribe(($searchFilterStoreProps) => {
  if (
    !oldSearchFilterStoreProps ||
    searchFitterStorePropsNotEqual(oldSearchFilterStoreProps, $searchFilterStoreProps)
  ) {
    oldSearchFilterStoreProps = $searchFilterStoreProps;
    searchFilterChanges.set($searchFilterStoreProps);
  }
});

export default derived([searchFilterChanges, settings], ([$searchFilterStoreProps, $settings]) => ({
  ...$searchFilterStoreProps,
  sources: $settings.sources,
})) as SearchRequestParametersStore;
