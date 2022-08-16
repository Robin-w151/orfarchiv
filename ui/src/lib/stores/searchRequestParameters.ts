import type { SearchRequestParameters } from '$lib/models/news';
import searchTextFilter from './searchTextFilter';
import settings from './settings';
import { derived, type Readable } from 'svelte/store';

export interface SearchRequestParametersStore extends Partial<SearchRequestParameters> {
  subscribe: Readable<SearchRequestParameters>['subscribe'];
}

export default derived([searchTextFilter, settings], ([$searchTextFilter, $settings]) => ({
  ...$searchTextFilter,
  sources: $settings.sources,
})) as SearchRequestParametersStore;
