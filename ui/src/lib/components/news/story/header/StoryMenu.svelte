<script lang="ts">
  import classNames from 'classnames';
  import ShareIcon from '$lib/components/ui/icons/outline/ShareIcon.svelte';
  import NewspaperIcon from '$lib/components/ui/icons/outline/NewspaperIcon.svelte';
  import ClipboardDocumentIcon from '$lib/components/ui/icons/outline/ClipboardDocumentIcon.svelte';

  export let url: string;
  export let onClose: any;

  const menuClass = classNames(['flex flex-col gap-2', 'p-2', 'bg-white', 'rounded-lg shadow-md']);
  const menuButtonClass = classNames([
    'flex gap-2',
    'p-2',
    'text-blue-800 hover:text-blue-600 hover:bg-blue-100 focus:bg-blue-100',
    'focus:outline-none',
    'rounded-lg cursor-pointer',
    'transition',
  ]);

  $: shareData = url ? { text: url } : undefined;
  $: showShareButton = isWebShareAvailable(shareData);
  $: showCopyToClipboardButton = isClipboardAvailable();

  function isWebShareAvailable(data: ShareData): boolean {
    return navigator.canShare?.(data) && !!navigator.share;
  }

  function isClipboardAvailable(): boolean {
    return !!navigator.clipboard?.writeText;
  }

  function handleOpenArticleClick() {
    onClose();
  }

  function handleShareArticleClick() {
    navigator.share(shareData);
    onClose();
  }

  function handleCopyToClipboardClick() {
    navigator.clipboard.writeText(url);
    onClose();
  }
</script>

<div class={menuClass}>
  <a class={menuButtonClass} href={url} target="_blank" rel="noopener" on:click={handleOpenArticleClick}>
    <NewspaperIcon />
    <span>Link zum Artikel</span>
  </a>
  {#if showShareButton}
    <button class={menuButtonClass} on:click={handleShareArticleClick}>
      <ShareIcon />
      <span>Teilen</span>
    </button>
  {:else if showCopyToClipboardButton}
    <button class={menuButtonClass} on:click={handleCopyToClipboardClick}>
      <ClipboardDocumentIcon />
      <span>In Zwischenablage kopieren</span>
    </button>
  {/if}
</div>
