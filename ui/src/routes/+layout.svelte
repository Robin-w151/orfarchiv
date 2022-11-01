<script lang="ts" context="module">
  import { inject } from '@vercel/analytics';
  import { browser, dev } from '$app/environment';

  if (browser && !dev) {
    inject();
  }
</script>

<script lang="ts">
  import { webVitals } from '$lib/utils/vitals';
  import { page } from '$app/stores';
  import Header from '$lib/components/ui/content/Header.svelte';
  import '../app.scss';
  import styles, { type ColorScheme } from '$lib/stores/styles';

  const analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  $: if (browser && analyticsId) {
    webVitals({
      path: $page.url.pathname,
      params: $page.params,
      analyticsId,
    });
  }
  $: if (browser) {
    if (document.documentElement.classList.contains('dark')) {
      styles.toggleColorScheme();
    }
  }
  $: if (browser) applyColorScheme($styles.colorScheme);

  const wrapperClass = `
    flex flex-col gap-2 sm:gap-3
    p-2 pb-4 sm:p-4
    w-screen max-w-screen-lg
  `;
  const mainClass = 'flex flex-col gap-2 sm:gap-3';

  function applyColorScheme(colorScheme: ColorScheme) {
    const rootClasses = document.documentElement.classList;
    if (colorScheme === 'light') {
      rootClasses.remove('dark');
    }
    if (colorScheme === 'dark') {
      rootClasses.add('dark');
    }
  }
</script>

<div class={wrapperClass}>
  <Header />
  <main class={mainClass}>
    <slot />
  </main>
</div>
