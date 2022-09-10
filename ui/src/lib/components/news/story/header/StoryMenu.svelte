<script lang="ts">
  import ShareIcon from '$lib/components/ui/icons/outline/ShareIcon.svelte';
  import NewspaperIcon from '$lib/components/ui/icons/outline/NewspaperIcon.svelte';
  import ClipboardDocumentIcon from '$lib/components/ui/icons/outline/ClipboardDocumentIcon.svelte';
  import QuestionMarkCircleIcon from '$lib/components/ui/icons/outline/QuestionMarkCircleIcon.svelte';

  export let url: string;
  export let onClose: any;

  const menuClass = `
    flex flex-col gap-2
    p-2
    bg-white
    rounded-lg shadow-md
  `;
  const menuButtonClass = `
    flex gap-2
    p-2
    text-blue-700 hover:text-blue-600 hover:bg-blue-100 focus:bg-blue-100
    focus:outline-none
    rounded-lg cursor-pointer
    transition
  `;

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

  function handleOpenSupportClick() {
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
      <span>Artikel teilen</span>
    </button>
  {:else if showCopyToClipboardButton}
    <button class={menuButtonClass} on:click={handleCopyToClipboardClick}>
      <ClipboardDocumentIcon />
      <span>In Zwischenablage kopieren</span>
    </button>
  {/if}
  <a
    class={menuButtonClass}
    href="https://der.orf.at/kontakt/orf-online-angebote100.html"
    target="_blank"
    rel="noopener"
    on:click={handleOpenSupportClick}
  >
    <QuestionMarkCircleIcon />
    <span>Kundendienst</span>
  </a>
</div>
