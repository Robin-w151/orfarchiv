<script lang="ts">
  import '../app.scss';
  import CogIcon from '$lib/components/ui/icons/outline/CogIcon.svelte';
  import RefreshIcon from '$lib/components/ui/icons/outline/RefreshIcon.svelte';
  import ButtonLink from '$lib/components/ui/controls/ButtonLink.svelte';
  import { refreshNews } from '$lib/stores/newsEvents';
  import { webVitals } from '$lib/utils/vitals';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { defaultPadding } from '$lib/utils/styles';
  import TextGradient from '$lib/components/ui/content/TextGradient.svelte';

  const analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  $: if (browser && analyticsId) {
    webVitals({
      path: $page.url.pathname,
      params: $page.params,
      analyticsId,
    });
  }

  const wrapperClass = `
    flex flex-col gap-2 sm:gap-3
    p-2 pb-4 sm:p-4
    w-screen max-w-screen-lg
  `;
  const headerClass = `
    flex justify-between items-center gap-6
    ${defaultPadding}
    text-3xl
    text-blue-700 bg-white
  `;
  const headerTitleClass = 'focus:bg-blue-100 outline-none rounded-md';
  const headerActionsClass = 'flex gap-2';
  const mainClass = 'flex flex-col gap-2 sm:gap-3';

  function handleRefreshButtonClick() {
    refreshNews.notify();
  }
</script>

<div class={wrapperClass}>
  <header class={headerClass}>
    <h1>
      <a class={headerTitleClass} href="/" title="Startseite" data-sveltekit-prefetch>
        <TextGradient>ORF Archiv</TextGradient>
      </a>
    </h1>
    <div class={headerActionsClass}>
      <ButtonLink href="/" title="Nach Updates suchen" iconOnly on:click={handleRefreshButtonClick} preventDefault>
        <RefreshIcon />
      </ButtonLink>
      <ButtonLink href="/settings" title="Einstellungen" iconOnly prefetch>
        <CogIcon />
      </ButtonLink>
    </div>
  </header>
  <main class={mainClass}>
    <slot />
  </main>
</div>
