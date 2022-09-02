<script lang="ts">
  import '../app.scss';
  import classNames from 'classnames';
  import CogIcon from '$lib/components/ui/icons/outline/CogIcon.svelte';
  import RefreshIcon from '$lib/components/ui/icons/outline/RefreshIcon.svelte';
  import ButtonLink from '$lib/components/ui/controls/ButtonLink.svelte';
  import { refreshNews } from '$lib/stores/newsEvents';
  import { webVitals } from '$lib/utils/vitals';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { defaultPadding } from '$lib/utils/styles';

  const analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  $: if (browser && analyticsId) {
    webVitals({
      path: $page.url.pathname,
      params: $page.params,
      analyticsId,
    });
  }

  const wrapperClass = classNames(['flex flex-col gap-2 sm:gap-3', 'p-2 pb-4 sm:p-4', 'w-screen max-w-screen-lg']);
  const headerClass = classNames([
    'flex justify-between items-center gap-6',
    defaultPadding,
    'text-3xl',
    'text-blue-900 bg-white',
  ]);
  const headerTitleClass = classNames(['outline-none']);
  const headerActionsClass = classNames(['flex gap-2']);
  const mainClass = classNames(['flex flex-col gap-2 sm:gap-3']);

  function handleRefreshButtonClick() {
    refreshNews.notify();
  }
</script>

<div class={wrapperClass}>
  <header class={headerClass}>
    <h1>
      <a class={headerTitleClass} href="/" title="Startseite" data-sveltekit-prefetch>
        <span class="hidden sm:inline">ORF&nbsp;</span><span class="whitespace-nowrap">News Archiv</span>
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
