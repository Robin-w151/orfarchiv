<script lang="ts">
  import '../app.scss';
  import classNames from 'classnames';
  import CogIcon from '$lib/components/ui/icons/outline/CogIcon.svelte';
  import RefreshIcon from '$lib/components/ui/icons/outline/RefreshIcon.svelte';
  import ButtonLink from '$lib/components/ui/controls/ButtonLink.svelte';
  import { refreshNews } from '$lib/stores/newsEvents';
  import { webVitals } from '$lib/utils/vitals';
  import { browser } from '$app/env';
  import { page } from '$app/stores';

  const analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  $: if (browser && analyticsId) {
    webVitals({
      path: $page.url.pathname,
      params: $page.params,
      analyticsId,
    });
  }

  const wrapperClass = classNames(['flex flex-col gap-3 sm:gap-4', 'p-2 sm:p-4', 'w-screen max-w-screen-lg']);
  const headerClass = classNames([
    'flex justify-between items-center gap-6',
    'px-3 sm:px-6 py-3',
    'text-3xl',
    'text-blue-900 bg-white',
    'rounded-lg shadow-md',
  ]);
  const headerTitleClass = classNames(['outline-none']);
  const headerActionsClass = classNames(['flex gap-2']);
  const mainClass = classNames(['flex flex-col gap-4']);

  function handleRefreshButtonClick() {
    refreshNews.notify();
  }
</script>

<div class={wrapperClass}>
  <header class={headerClass}>
    <h1>
      <a class={headerTitleClass} href="/" title="Startseite">
        <span class="hidden sm:inline">ORF&nbsp;</span><span class="whitespace-nowrap">News Archiv</span>
      </a>
    </h1>
    <div class={headerActionsClass}>
      <ButtonLink href="/" title="Nach Updates suchen" on:click={handleRefreshButtonClick} preventDefault>
        <RefreshIcon />
      </ButtonLink>
      <ButtonLink href="/settings" title="Einstellungen">
        <CogIcon />
      </ButtonLink>
    </div>
  </header>
  <main class={mainClass}>
    <slot />
  </main>
</div>
