<script lang="ts" context="module">
  import { inject } from '@vercel/analytics';
  import { browser } from '$app/environment';
  import { PUBLIC_ENABLE_ANALYTICS } from '$env/static/public';

  function isAnalyticsEnabled() {
    return PUBLIC_ENABLE_ANALYTICS === 'true';
  }

  if (browser && isAnalyticsEnabled()) {
    inject();
  }
</script>

<script lang="ts">
  import { webVitals } from '$lib/utils/vitals';
  import { page } from '$app/stores';

  const analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  $: if (browser && isAnalyticsEnabled() && analyticsId) {
    const { url, params } = $page;
    webVitals({
      path: url.pathname,
      params,
      analyticsId,
    });
  }
</script>
