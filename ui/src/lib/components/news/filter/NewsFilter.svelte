<script lang="ts">
  import searchFilter from '$lib/stores/searchFilter';
  import Input from '$lib/components/ui/controls/Input.svelte';
  import classNames from 'classnames';
  import { defaultPadding } from '$lib/utils/styles';
  import type { Unsubscriber } from 'svelte/store';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { startSearch } from '$lib/stores/newsEvents';
  import { unsubscribeAll } from '$lib/utils/subscriptions';
  import Popover from '$lib/components/ui/controls/Popover.svelte';
  import NewsFilterMenu from '$lib/components/news/filter/NewsFilterMenu.svelte';
  import FunnelIcon from '$lib/components/ui/icons/outline/FunnelIcon.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import BookmarkIcon from '$lib/components/ui/icons/outline/BookmarkIcon.svelte';
  import NewspaperIcon from '$lib/components/ui/icons/outline/NewspaperIcon.svelte';

  export let showReadLaterList = false;

  const dispatch = createEventDispatcher();

  const filterClass = classNames(['flex gap-2', defaultPadding, 'w-full', 'bg-white dark:bg-gray-900']);

  let subscriptions: Array<Unsubscriber> = [];
  let textFilterInputRef: Input | null = null;

  $: toggleReadLaterTitle = showReadLaterList ? 'Alle News anzeigen' : 'Lesezeichen anzeigen';

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

  function handleReadLaterToggleButtonClick() {
    dispatch('toggleReadLater');
  }

  function handleDateFilterFromChange({ detail: from }: { detail: string }) {
    searchFilter.setFrom(from);
  }

  function handleDateFilterToChange({ detail: to }: { detail: string }) {
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
  <Button btnType="secondary" iconOnly title={toggleReadLaterTitle} on:click={handleReadLaterToggleButtonClick}>
    {#if showReadLaterList}
      <NewspaperIcon />
    {:else}
      <BookmarkIcon />
    {/if}
  </Button>
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
