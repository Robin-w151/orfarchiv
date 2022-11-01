<script lang="ts">
  import { defaultPadding } from '$lib/utils/styles';
  import { refreshNews } from '$lib/stores/newsEvents';
  import CogIcon from '$lib/components/ui/icons/outline/CogIcon.svelte';
  import RefreshIcon from '$lib/components/ui/icons/outline/RefreshIcon.svelte';
  import ButtonLink from '$lib/components/ui/controls/ButtonLink.svelte';
  import TextGradient from '$lib/components/ui/content/TextGradient.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import SunIcon from '$lib/components/ui/icons/outline/SunIcon.svelte';
  import styles from '$lib/stores/styles';
  import MoonIcon from '$lib/components/ui/icons/outline/MoonIcon.svelte';
  import { browser } from '$app/environment';

  const headerClass = `
    flex justify-between items-center gap-6
    ${defaultPadding}
    text-3xl
    text-blue-700 bg-white dark:bg-gray-900
  `;
  const headerTitleClass = 'focus:bg-blue-100 dark:focus:bg-blue-900 outline-none rounded-md';
  const headerActionsClass = 'flex gap-2';

  function handleToggleColorSchemeClick() {
    styles.toggleColorScheme();
  }

  function handleRefreshButtonClick() {
    refreshNews.notify();
  }
</script>

<header class={headerClass}>
  <h1>
    <a class={headerTitleClass} href="/" title="Startseite" data-sveltekit-prefetch>
      <TextGradient>ORF Archiv</TextGradient>
    </a>
  </h1>
  <div class={headerActionsClass}>
    {#if browser}
      <Button btnType="secondary" iconOnly on:click={handleToggleColorSchemeClick}>
        {#if $styles.colorScheme === 'dark'}
          <SunIcon />
        {:else}
          <MoonIcon />
        {/if}
      </Button>
    {/if}
    <ButtonLink href="/" title="Nach Updates suchen" iconOnly on:click={handleRefreshButtonClick} preventDefault>
      <RefreshIcon />
    </ButtonLink>
    <ButtonLink href="/settings" title="Einstellungen" iconOnly prefetch>
      <CogIcon />
    </ButtonLink>
  </div>
</header>
