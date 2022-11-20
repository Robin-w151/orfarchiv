<script lang="ts">
  import Button from '$lib/components/ui/controls/Button.svelte';
  import PopoverContent from '$lib/components/ui/controls/PopoverContent.svelte';
  import TrashIcon from '$lib/components/ui/icons/outline/TrashIcon.svelte';
  import { defaultMenuClass, defaultMenuItemClass } from '$lib/utils/styles';
  import { createEventDispatcher } from 'svelte';

  export let onClose: () => void;

  const dispatch = createEventDispatcher();

  const menuDeleteItemClass = `
    flex gap-2
    p-2
    text-red-700 hover:text-red-600 focus:text-red-600 hover:bg-gray-100 focus:bg-gray-100
    dark:hover:bg-gray-800 dark:focus:bg-gray-800
    focus:outline-none
    rounded-lg cursor-pointer
    transition
  `;

  function handleRemoveAllBookmarksButtonClick() {
    dispatch('removeAllBookmarks');
    onClose();
  }

  function handleRemoveAllViewedBookmarksButtonClick() {
    dispatch('removeAllViewedBookmarks');
    onClose();
  }
</script>

<PopoverContent class={defaultMenuClass}>
  <Button class={menuDeleteItemClass} customStyle on:click={handleRemoveAllBookmarksButtonClick}>
    <TrashIcon />
    <span>Alle Lesezeichen löschen</span>
  </Button>
  <Button class={menuDeleteItemClass} customStyle on:click={handleRemoveAllViewedBookmarksButtonClick}>
    <TrashIcon />
    <span>Gelesene Lesezeichen löschen</span>
  </Button>
</PopoverContent>
