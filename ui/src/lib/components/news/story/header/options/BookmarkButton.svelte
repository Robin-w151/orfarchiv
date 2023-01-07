<script lang="ts">
  import Button from '$lib/components/ui/controls/Button.svelte';
  import BookmarkIcon from '$lib/components/ui/icons/outline/BookmarkIcon.svelte';
  import BookmarkSlashIcon from '$lib/components/ui/icons/outline/BookmarkSlashIcon.svelte';
  import type { Story } from '$lib/models/story';
  import bookmarks from '$lib/stores/bookmarks';

  export let story: Story;
  export let onClose: () => void;

  let clazz: string;
  export { clazz as class };

  function handleAddToBookmarksClick() {
    bookmarks.add(story);
    onClose();
  }

  function handleRemoveFromBookmarksClick() {
    bookmarks.remove(story);
    onClose();
  }
</script>

{#if story.isBookmarked}
  <Button class={clazz} customStyle on:click={handleRemoveFromBookmarksClick}>
    <BookmarkSlashIcon />
    <span>Von Lesezeichen entfernen</span>
  </Button>
{:else}
  <Button class={clazz} customStyle on:click={handleAddToBookmarksClick}>
    <BookmarkIcon />
    <span>Zu Lesezeichen hinzufügen</span>
  </Button>
{/if}
