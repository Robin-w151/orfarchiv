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

  const analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  $: if (browser && analyticsId) {
    const { url, params } = $page;
    webVitals({
      path: url.pathname,
      params,
      analyticsId,
    });
  }
</script>
