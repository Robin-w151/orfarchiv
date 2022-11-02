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
  import { onDestroy, onMount } from 'svelte';

  const analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  $: if (browser && analyticsId) {
    webVitals({
      path: $page.url.pathname,
      params: $page.params,
      analyticsId,
    });
  }
  $: if (browser) applyColorScheme($styles.colorScheme);

  const wrapperClass = `
    flex flex-col gap-2 sm:gap-3
    p-2 pb-4 sm:p-4
    w-screen max-w-screen-lg
  `;
  const mainClass = 'flex flex-col gap-2 sm:gap-3';

  onMount(() => {
    if (browser) {
      getPrefersDarkColorSchemeQuery().addEventListener('change', changeColorScheme);
    }
  });

  onDestroy(() => {
    if (browser) {
      getPrefersDarkColorSchemeQuery().removeEventListener('change', changeColorScheme);
    }
  });

  function applyColorScheme(colorScheme: ColorScheme, prefersDarkColorScheme?: boolean) {
    if (colorScheme === 'system') {
      if (prefersDarkColorScheme ?? getPrefersDarkColorSchemeQuery()?.matches) {
        setDarkClass();
      } else {
        setLightClass();
      }
    }
    if (colorScheme === 'light') {
      setLightClass();
    }
    if (colorScheme === 'dark') {
      setDarkClass();
    }
  }

  function changeColorScheme({ matches: prefersDarkColorScheme }) {
    const colorScheme = $styles.colorScheme;
    if (colorScheme === 'system') {
      applyColorScheme(colorScheme, prefersDarkColorScheme);
    }
  }

  function getPrefersDarkColorSchemeQuery() {
    return window.matchMedia('(prefers-color-scheme: dark)');
  }

  function setLightClass() {
    document.documentElement.classList.remove('dark');
  }

  function setDarkClass() {
    document.documentElement.classList.add('dark');
  }
</script>

<div class={wrapperClass}>
  <Header />
  <main class={mainClass}>
    <slot />
  </main>
</div>
