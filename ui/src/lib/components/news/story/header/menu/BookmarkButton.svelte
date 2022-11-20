<script lang="ts">
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
  <button class={clazz} on:click={handleRemoveFromBookmarksClick}>
    <BookmarkSlashIcon />
    <span>Von Lesezeichen entfernen</span>
  </button>
{:else}
  <button class={clazz} on:click={handleAddToBookmarksClick}>
    <BookmarkIcon />
    <span>Zu Lesezeichen hinzufügen</span>
  </button>
{/if}
