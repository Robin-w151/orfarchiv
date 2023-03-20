<script lang="ts">
  import Button from '$lib/components/ui/controls/Button.svelte';
  import ClipboardDocumentIcon from '$lib/components/ui/icons/outline/ClipboardDocumentIcon.svelte';
  import ShareIcon from '$lib/components/ui/icons/outline/ShareIcon.svelte';
  import type { Story } from '$lib/models/story';

  export let story: Story;
  export let onClose: () => void;

  let clazz: string;
  export { clazz as class };

  $: shareData = story?.url ? { text: story?.url } : undefined;
  $: showShareButton = shareData && isWebShareAvailable(shareData);
  $: showCopyToClipboardButton = isClipboardAvailable();

  function isWebShareAvailable(data: ShareData): boolean {
    return navigator.canShare?.(data) && !!navigator.share;
  }

  function isClipboardAvailable(): boolean {
    return !!navigator.clipboard?.writeText;
  }

  function handleShareArticleClick() {
    navigator.share(shareData);
    onClose();
  }

  function handleCopyToClipboardClick() {
    navigator.clipboard.writeText(story.url);
    onClose();
  }
</script>

{#if showShareButton}
  <Button class={clazz} customStyle on:click={handleShareArticleClick}>
    <ShareIcon />
    <span>Artikel teilen</span>
  </Button>
{:else if showCopyToClipboardButton}
  <Button class={clazz} customStyle on:click={handleCopyToClipboardClick}>
    <ClipboardDocumentIcon />
    <span>In Zwischenablage kopieren</span>
  </Button>
{/if}
