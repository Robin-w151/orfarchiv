<script lang="ts" context="module">
  import { inject } from '@vercel/analytics';
  import { injectSpeedInsights } from '@vercel/speed-insights';
  import { browser } from '$app/environment';
  import { PUBLIC_ENABLE_ANALYTICS } from '$env/static/public';

  function isAnalyticsEnabled() {
    return PUBLIC_ENABLE_ANALYTICS === 'true';
  }

  if (browser && isAnalyticsEnabled()) {
    inject();
    injectSpeedInsights();
  }
</script>
