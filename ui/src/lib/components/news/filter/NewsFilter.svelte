<script lang="ts">
  import Input from '$lib/components/ui/controls/Input.svelte';
  import { startSearch } from '$lib/stores/newsEvents';
  import searchFilter from '$lib/stores/searchFilter';
  import { defaultBackground, defaultPadding } from '$lib/utils/styles';
  import { unsubscribeAll, type Subscription } from '$lib/utils/subscriptions';
  import { onDestroy, onMount } from 'svelte';
  import NewsFilterPopover from '$lib/components/news/filter/NewsFilterPopover.svelte';

  const subscriptions: Array<Subscription> = [];

  const filterClass = `flex gap-2 ${defaultPadding} w-full ${defaultBackground}`;

  let textFilterInputRef: Input | null = null;

  onMount(() => {
    subscriptions.push(startSearch.onUpdate(handleStartSearch));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  function handleStartSearch() {
    textFilterInputRef?.focus();
  }

  function handleTextFilterChange({ detail: textFilter }: { detail: string }) {
    searchFilter.setTextFilter(textFilter);
  }

  function handleDateFilterFromChange({ detail: from }: { detail: string }) {
    searchFilter.setFrom(from);
  }

  function handleDateFilterToChange({ detail: to }: { detail: string }) {
    searchFilter.setTo(to);
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
  <NewsFilterPopover
    from={$searchFilter.tempSearchFilter.dateFilter?.from}
    to={$searchFilter.tempSearchFilter.dateFilter?.to}
    on:fromChange={handleDateFilterFromChange}
    on:toChange={handleDateFilterToChange}
    on:apply={searchFilter.applyTempSearchFilter}
    on:reset={searchFilter.resetDateFilter}
    on:selectToday={searchFilter.selectDateFilterToday}
    on:selectLastWeek={searchFilter.selectDateFilterLastWeek}
    on:selectLastMonth={searchFilter.selectDateFilterLastMonth}
    on:selectLastYear={searchFilter.selectDateFilterLastYear}
  />
</div>
