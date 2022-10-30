<script lang="ts">
  import ShareIcon from '$lib/components/ui/icons/outline/ShareIcon.svelte';
  import NewspaperIcon from '$lib/components/ui/icons/outline/NewspaperIcon.svelte';
  import ClipboardDocumentIcon from '$lib/components/ui/icons/outline/ClipboardDocumentIcon.svelte';
  import QuestionMarkCircleIcon from '$lib/components/ui/icons/outline/QuestionMarkCircleIcon.svelte';

  export let url: string;
  export let onClose: () => void;

  const menuClass = `
    flex flex-col gap-2
    p-2
    bg-white dark:bg-gray-900
    rounded-lg shadow-md dark:shadow-2xl
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
  <a class={menuItemClass} href={url} target="_blank" rel="noreferrer" on:click={handleOpenArticleClick}>
    <NewspaperIcon />
    <span>Link zum Artikel</span>
  </a>
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
    rel="noreferrer"
    on:click={handleOpenSupportClick}
  >
    <QuestionMarkCircleIcon />
    <span>Kundendienst</span>
  </a>
</div>
