import type { SearchRequestParameters } from '$lib/models/searchRequest';
import searchFilter from './searchFilter';
import settings from './settings';
import { derived, type Readable } from 'svelte/store';

export interface SearchRequestParametersStore extends Partial<SearchRequestParameters> {
  subscribe: Readable<SearchRequestParameters>['subscribe'];
}

export default derived([searchFilter, settings], ([$searchFilter, $settings]) => ({
  ...$searchFilter,
  sources: $settings.sources,
})) as SearchRequestParametersStore;
