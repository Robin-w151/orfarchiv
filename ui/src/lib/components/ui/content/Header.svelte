<script lang="ts">
  import TextGradient from '$lib/components/ui/content/TextGradient.svelte';
  import ButtonLink from '$lib/components/ui/controls/ButtonLink.svelte';
  import BookmarkSquareIcon from '$lib/components/ui/icons/outline/BookmarkSquareIcon.svelte';
  import CogIcon from '$lib/components/ui/icons/outline/CogIcon.svelte';
  import RefreshIcon from '$lib/components/ui/icons/outline/RefreshIcon.svelte';
  import { refreshNews } from '$lib/stores/newsEvents';
  import { defaultPadding } from '$lib/utils/styles';
  import { page } from '$app/stores';

  const headerClass = `
    flex justify-between items-center gap-6
    ${defaultPadding}
    text-3xl
    text-blue-700 bg-white dark:bg-gray-900
  `;
  const headerTitleClass = 'focus:bg-blue-100 dark:focus:bg-blue-900 outline-none rounded-md';
  const headerActionsClass = 'flex gap-2';

  $: showReloadButton = $page.url.pathname === '/';

  function handleRefreshButtonClick() {
    refreshNews.notify();
  }
</script>

<header class={headerClass}>
  <h1>
    <a class={headerTitleClass} href="/" title="Startseite" data-sveltekit-preload-code="hover">
      <TextGradient>ORF Archiv</TextGradient>
    </a>
  </h1>
  <div class={headerActionsClass}>
    {#if showReloadButton}
      <ButtonLink href="/" title="Nach Updates suchen" iconOnly on:click={handleRefreshButtonClick} preventDefault>
        <RefreshIcon />
      </ButtonLink>
    {/if}
    <ButtonLink href="/bookmarks" title="Lesezeichen" iconOnly prefetch>
      <BookmarkSquareIcon />
    </ButtonLink>
    <ButtonLink href="/settings" title="Einstellungen" iconOnly prefetch>
      <CogIcon />
    </ButtonLink>
  </div>
</header>
