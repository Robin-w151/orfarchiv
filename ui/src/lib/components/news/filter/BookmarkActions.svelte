<script lang="ts">
  import Input from '$lib/components/ui/controls/Input.svelte';
  import Popover from '$lib/components/ui/content/Popover.svelte';
  import TrashIcon from '$lib/components/ui/icons/outline/TrashIcon.svelte';
  import bookmarks from '$lib/stores/bookmarks';
  import { startSearch } from '$lib/stores/newsEvents';
  import { defaultBackground, defaultPadding } from '$lib/utils/styles';
  import { unsubscribeAll } from '$lib/utils/subscriptions';
  import { onDestroy, onMount } from 'svelte';
  import type { Unsubscriber } from 'svelte/store';
  import BookmarkDeleteMenu from './BookmarkDeleteMenu.svelte';

  const filterClass = `flex gap-2 ${defaultPadding} w-full ${defaultBackground}`;

  let subscriptions: Array<Unsubscriber> = [];
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
    bookmarks.setTextFilter(textFilter);
  }

  function handleDeleteAllBookmarks() {
    bookmarks.removeAll();
  }

  function handleDeleteAllViewedBookmarks() {
    bookmarks.removeAllViewed();
  }
</script>

<div class={filterClass} id="bookmark-filter">
  <Input
    id="text-filter-input"
    value={$bookmarks.textFilter}
    on:change={handleTextFilterChange}
    bind:this={textFilterInputRef}
    placeholder="Suche"
  />
  <Popover btnType="secondary" iconOnly title="Lesezeichen löschen" placement="bottom-end" let:onClose>
    <TrashIcon slot="button-content" />
    <BookmarkDeleteMenu
      slot="content"
      {onClose}
      on:removeAllBookmarks={handleDeleteAllBookmarks}
      on:removeAllViewedBookmarks={handleDeleteAllViewedBookmarks}
    />
  </Popover>
</div>
