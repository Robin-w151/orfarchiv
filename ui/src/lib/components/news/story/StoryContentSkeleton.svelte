<script lang="ts">
  import classNames from 'classnames';

  const loadingIndicatorClass = classNames(['flex flex-col items-start gap-2', 'w-full']);
  const loadingIndicatorBarClass = classNames(['h-4', 'bg-gray-300', 'rounded-sm animate-pulse']);
</script>

<div class={loadingIndicatorClass} data-testid="story-content-skeleton">
  <span class={loadingIndicatorBarClass} style:width="40%" style:margin-bottom="0.5rem" />
  <span class={loadingIndicatorBarClass} style:width="95%" />
  <span class={loadingIndicatorBarClass} style:width="85%" />
  <span class={loadingIndicatorBarClass} style:width="90%" />
</div>
