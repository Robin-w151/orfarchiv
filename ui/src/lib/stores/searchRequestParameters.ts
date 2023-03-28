import type { SearchRequestParameters } from '$lib/models/searchRequest';
import searchFilter, { type SearchFilterStoreProps } from './searchFilter';
import settings from './settings';
import { derived, type Readable } from 'svelte/store';
import { distinctUntilChanged } from './utils';
import { browser } from '$app/environment';

export interface SearchRequestParametersStore
  extends Readable<SearchRequestParameters>,
    Partial<SearchRequestParameters> {}

function searchFilterStorePropsNotEqual(p1?: SearchFilterStoreProps, p2?: SearchFilterStoreProps): boolean {
  return (
    p1?.textFilter !== p2?.textFilter ||
    p1?.dateFilter?.from !== p2?.dateFilter?.from ||
    p1?.dateFilter?.to !== p2?.dateFilter?.to
  );
}

const searchFilterChanged = distinctUntilChanged(searchFilter, searchFilterStorePropsNotEqual);

const searchRequestParameters = derived([searchFilterChanged, settings], ([$searchFilterStoreProps, $settings]) => ({
  ...$searchFilterStoreProps,
  sources: $settings.sources,
})) as SearchRequestParametersStore;

if (browser) {
  console.log('searchRequestParameters-store-initialized');
}

export default searchRequestParameters;
