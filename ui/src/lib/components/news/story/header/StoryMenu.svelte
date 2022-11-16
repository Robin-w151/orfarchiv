<script lang="ts">
  import ShareIcon from '$lib/components/ui/icons/outline/ShareIcon.svelte';
  import NewspaperIcon from '$lib/components/ui/icons/outline/NewspaperIcon.svelte';
  import ClipboardDocumentIcon from '$lib/components/ui/icons/outline/ClipboardDocumentIcon.svelte';
  import QuestionMarkCircleIcon from '$lib/components/ui/icons/outline/QuestionMarkCircleIcon.svelte';
  import PopoverContent from '$lib/components/ui/controls/PopoverContent.svelte';
  import BookmarkIcon from '$lib/components/ui/icons/outline/BookmarkIcon.svelte';
  import bookmarks from '$lib/stores/bookmarks';
  import type { Story } from '$lib/models/story';
  import BookmarkSlashIcon from '$lib/components/ui/icons/outline/BookmarkSlashIcon.svelte';

  export let story: Story;
  export let onClose: () => void;

  const menuClass = `
    flex flex-col gap-2
    p-2
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

  $: shareData = story.url ? { text: story.url } : undefined;
  $: showShareButton = shareData && isWebShareAvailable(shareData);
  $: showCopyToClipboardButton = isClipboardAvailable();
  $: isBookmarked = bookmarks.isBookmarked(story);

  function isWebShareAvailable(data: ShareData): boolean {
    return navigator.canShare?.(data) && !!navigator.share;
  }

  function isClipboardAvailable(): boolean {
    return !!navigator.clipboard?.writeText;
  }

  function handleOpenArticleClick() {
    onClose();
  }

  function handleAddToBookmarksClick() {
    bookmarks.addStory(story);
    onClose();
  }

  function handleRemoveFromBookmarksClick() {
    bookmarks.removeStory(story);
    onClose();
  }

  function handleShareArticleClick() {
    navigator.share(shareData);
    onClose();
  }

  function handleCopyToClipboardClick() {
    navigator.clipboard.writeText(story.url);
    onClose();
  }

  function handleOpenSupportClick() {
    onClose();
  }
</script>

<PopoverContent class={menuClass}>
  <a class={menuItemClass} href={story.url} target="_blank" rel="noopener noreferrer" on:click={handleOpenArticleClick}>
    <NewspaperIcon />
    <span>In orf.at öffnen</span>
  </a>
  {#if isBookmarked}
    <button class={menuItemClass} on:click={handleRemoveFromBookmarksClick}>
      <BookmarkSlashIcon />
      <span>Von Lesezeichen entfernen</span>
    </button>
  {:else}
    <button class={menuItemClass} on:click={handleAddToBookmarksClick}>
      <BookmarkIcon />
      <span>Zu Lesezeichen hinzufügen</span>
    </button>
  {/if}
  {#if showShareButton}
    <button class={menuItemClass} on:click={handleShareArticleClick}>
      <ShareIcon />
      <span>Artikel teilen</span>
    </button>
  {:else if showCopyToClipboardButton}
    <button class={menuItemClass} on:click={handleCopyToClipboardClick}>
      <ClipboardDocumentIcon />
      <span>In Zwischenablage kopieren</span>
    </button>
  {/if}
  <a
    class={menuItemClass}
    href="https://der.orf.at/kontakt/orf-online-angebote100.html"
    target="_blank"
    rel="noopener noreferrer"
    on:click={handleOpenSupportClick}
  >
    <QuestionMarkCircleIcon />
    <span>Kundendienst</span>
  </a>
</PopoverContent>
