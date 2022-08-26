<script lang="ts">
  import searchTextFilter from '$lib/stores/searchTextFilter';
  import Input from '$lib/components/ui/controls/Input.svelte';
  import classNames from 'classnames';
  import { defaultPadding } from '$lib/utils/styles';
  import type { Unsubscriber } from 'svelte/store';
  import { onDestroy, onMount } from 'svelte';
  import { startSearch } from '$lib/stores/newsEvents';
  import { unsubscribeAll } from '../../utils/subscriptions';

  let subscriptions: Array<Unsubscriber> = [];
  let searchInputRef: HTMLInputElement = null;

  const filterClass = classNames([defaultPadding, 'w-full', 'bg-white']);

  onMount(() => {
    subscriptions.push(startSearch.onUpdate(handleStartSearch));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  function handleStartSearch() {
    searchInputRef.focus();
  }

  function handleSearchChange({ detail: search }: { detail: string }) {
    searchTextFilter.setSearchTextFilter(search);
  }
</script>

<div class={filterClass}>
  <Input
    id="search-input"
    value={$searchTextFilter.textFilter}
    on:change={handleSearchChange}
    bind:this={searchInputRef}
    placeholder="Suche"
  />
</div>
