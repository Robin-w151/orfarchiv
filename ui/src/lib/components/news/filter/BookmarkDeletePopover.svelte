<script lang="ts">
  import Button from '$lib/components/ui/controls/Button.svelte';
  import PopoverContent from '$lib/components/ui/content/PopoverContent.svelte';
  import TrashIcon from '$lib/components/ui/icons/outline/TrashIcon.svelte';
  import { defaultMenuClass } from '$lib/utils/styles';
  import { createEventDispatcher } from 'svelte';
  import Popover from '$lib/components/ui/content/Popover.svelte';

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
  }

  function handleRemoveAllViewedBookmarksButtonClick() {
    dispatch('removeAllViewedBookmarks');
  }
</script>

<Popover btnType="secondary" iconOnly title="Lesezeichen löschen" placement="bottom-end">
  <TrashIcon slot="button-content" />
  <PopoverContent class={defaultMenuClass} slot="content" let:onClose>
    <Button
      class={menuDeleteItemClass}
      customStyle
      on:click={() => {
        handleRemoveAllBookmarksButtonClick();
        onClose();
      }}
    >
      <TrashIcon />
      <span>Alle Lesezeichen löschen</span>
    </Button>
    <Button
      class={menuDeleteItemClass}
      customStyle
      on:click={() => {
        handleRemoveAllViewedBookmarksButtonClick();
        onClose();
      }}
    >
      <TrashIcon />
      <span>Gelesene Lesezeichen löschen</span>
    </Button>
  </PopoverContent>
</Popover>
