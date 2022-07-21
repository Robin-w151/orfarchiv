<script lang="ts">
  import '../app.css';
  import classNames from 'classnames';
  import CogIcon from '../lib/components/ui/icons/outline/CogIcon.svelte';
  import RefreshIcon from '../lib/components/ui/icons/outline/RefreshIcon.svelte';
  import ButtonLink from '../lib/components/ui/controls/ButtonLink.svelte';
  import { refreshNews } from '../lib/stores/newsEvents';

  const wrapperClass = classNames(['flex flex-col gap-4', 'p-4', 'w-screen max-w-screen-md']);
  const headerClass = classNames([
    'flex justify-between items-center',
    'px-6 py-3',
    'text-3xl',
    'text-blue-900 bg-white',
    'rounded-lg shadow-md',
  ]);
  const headerActionsClass = classNames(['flex gap-2']);
  const mainClass = classNames(['flex flex-col gap-4']);

  function handleRefreshButtonClick() {
    refreshNews.notify();
  }
</script>

<div class={wrapperClass}>
  <header class={headerClass}>
    <h1>
      <a href="/">
        <span class="hidden sm:inline">ORF&nbsp;</span><span>News Archiv</span>
      </a>
    </h1>
    <div class={headerActionsClass}>
      <ButtonLink on:click={handleRefreshButtonClick}>
        <RefreshIcon />
      </ButtonLink>
      <ButtonLink href="/settings">
        <CogIcon />
      </ButtonLink>
    </div>
  </header>
  <main class={mainClass}>
    <slot />
  </main>
</div>

<style>
</style>
