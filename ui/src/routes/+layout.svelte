<script lang="ts">
  import '../app.scss';
  import { webVitals } from '$lib/utils/vitals';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import Header from '$lib/components/ui/content/Header.svelte';

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
  const mainClass = 'flex flex-col gap-2 sm:gap-3';
</script>

<div class={wrapperClass}>
  <Header />
  <main class={mainClass}>
    <slot />
  </main>
</div>
