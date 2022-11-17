<script lang="ts">
  import PopoverContent from '$lib/components/ui/controls/PopoverContent.svelte';
  import type { Story } from '$lib/models/story';
  import BookmarkButton from './menu/BookmarkButton.svelte';
  import OpenArticleButton from './menu/OpenArticleButton.svelte';
  import OpenSupportButton from './menu/OpenSupportButton.svelte';
  import ShareButton from './menu/ShareButton.svelte';

  export let story: Story;
  export let onClose: () => void;

  const menuClass = `
    flex flex-col gap-2
    p-2 w-64 h-50
  `;
  const menuItemClass = `
    flex gap-2
    p-2
    text-blue-700 hover:text-fuchsia-600 focus:text-fuchsia-600 hover:bg-gray-100 focus:bg-gray-100
    dark:text-blue-500 dark:hover:text-fuchsia-400 dark:focus:text-fuchsia-400 dark:hover:bg-gray-800 dark:focus:bg-gray-800
    focus:outline-none
    rounded-lg cursor-pointer
    transition
  `;
</script>

<PopoverContent class={menuClass}>
  <OpenArticleButton class={menuItemClass} {story} {onClose} />
  <ShareButton class={menuItemClass} {story} {onClose} />
  <OpenSupportButton class={menuItemClass} {onClose} />
  <BookmarkButton class={menuItemClass} {story} {onClose} />
</PopoverContent>
