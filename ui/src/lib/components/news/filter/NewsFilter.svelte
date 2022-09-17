<script lang="ts">
  import searchFilter from '$lib/stores/searchFilter';
  import Input from '$lib/components/ui/controls/Input.svelte';
  import classNames from 'classnames';
  import { defaultPadding } from '$lib/utils/styles';
  import type { Unsubscriber } from 'svelte/store';
  import { onDestroy, onMount } from 'svelte';
  import { startSearch } from '$lib/stores/newsEvents';
  import { unsubscribeAll } from '$lib/utils/subscriptions';
  import Popover from '$lib/components/ui/controls/Popover.svelte';
  import NewsFilterMenu from '$lib/components/news/filter/NewsFilterMenu.svelte';
  import FunnelIcon from '$lib/components/ui/icons/outline/FunnelIcon.svelte';

  let subscriptions: Array<Unsubscriber> = [];
  let searchInputRef: HTMLInputElement = null;

  const filterClass = classNames(['flex gap-2', defaultPadding, 'w-full', 'bg-white']);

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
    searchFilter.setTextFilter(search);
  }
</script>

<div class={filterClass}>
  <Input
    id="search-input"
    value={$searchFilter.textFilter}
    on:change={handleSearchChange}
    bind:this={searchInputRef}
    placeholder="Suche"
  />
  <Popover btnType="secondary" iconOnly title="Weitere Filter-Optionen" placement="bottom-end">
    <FunnelIcon slot="button-content" />
    <NewsFilterMenu slot="content" />
  </Popover>
</div>
