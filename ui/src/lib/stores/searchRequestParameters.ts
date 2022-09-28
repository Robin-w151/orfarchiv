import type { SearchRequestParameters } from '$lib/models/searchRequest';
import searchFilter, { type SearchFilterStoreProps } from './searchFilter';
import settings from './settings';
import { derived, type Readable } from 'svelte/store';
import { distinctUntilChanged } from './utils';

export interface SearchRequestParametersStore extends Partial<SearchRequestParameters> {
  subscribe: Readable<SearchRequestParameters>['subscribe'];
}

function searchFilterStorePropsNotEqual(p1?: SearchFilterStoreProps, p2?: SearchFilterStoreProps): boolean {
  return (
    p1?.textFilter !== p2?.textFilter ||
    p1?.dateFilter?.from !== p2?.dateFilter?.from ||
    p1?.dateFilter?.to !== p2?.dateFilter?.to
  );
}

const searchFilterChanged = distinctUntilChanged(searchFilter, searchFilterStorePropsNotEqual);

export default derived([searchFilterChanged, settings], ([$searchFilterStoreProps, $settings]) => ({
  ...$searchFilterStoreProps,
  sources: $settings.sources,
})) as SearchRequestParametersStore;
