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
  let textFilterInputRef: HTMLInputElement = null;

  const filterClass = classNames(['flex gap-2', defaultPadding, 'w-full', 'bg-white']);

  onMount(() => {
    subscriptions.push(startSearch.onUpdate(handleStartSearch));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  function handleStartSearch() {
    textFilterInputRef.focus();
  }

  function handleTextFilterChange({ detail: textFilter }) {
    searchFilter.setTextFilter(textFilter);
  }

  function handleDateFilterFromChange({ detail: from }) {
    searchFilter.setFrom(from);
  }

  function handleDateFilterToChange({ detail: to }) {
    searchFilter.setTo(to);
  }

  function handleFilterMenuApply() {
    searchFilter.applyTempSearchFilter();
  }
</script>

<div class={filterClass} id="news-filter">
  <Input
    id="text-filter-input"
    value={$searchFilter.textFilter}
    on:change={handleTextFilterChange}
    bind:this={textFilterInputRef}
    placeholder="Suche"
  />
  <Popover btnType="secondary" iconOnly title="Weitere Filter-Optionen" placement="bottom-end" let:onClose>
    <FunnelIcon slot="button-content" />
    <NewsFilterMenu
      slot="content"
      from={$searchFilter.tempSearchFilter.dateFilter?.from}
      to={$searchFilter.tempSearchFilter.dateFilter?.to}
      {onClose}
      on:fromChange={handleDateFilterFromChange}
      on:toChange={handleDateFilterToChange}
      on:apply={handleFilterMenuApply}
    />
  </Popover>
</div>
