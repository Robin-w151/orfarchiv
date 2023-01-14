<script lang="ts">
  import clsx from 'clsx';

  const loadingIndicatorClass = clsx(['flex justify-center items-center gap-2', 'w-fit', $$props['class']]);
  const dotClass = clsx(['w-2 h-2', 'rounded-full']);
</script>

<div class="loading-indicator {loadingIndicatorClass}">
  <div class="dot-1 bg-fuchsia-500 {dotClass}" />
  <div class="dot-2 bg-violet-600 {dotClass}" />
  <div class="dot-3 bg-blue-700 {dotClass}" />
</div>

<style lang="scss">
  .loading-indicator {
    .dot-1 {
      animation: jump 1.6s -0.32s linear infinite;
    }

    .dot-2 {
      animation: jump 1.6s -0.16s linear infinite;
    }

    .dot-3 {
      animation: jump 1.6s linear infinite;
    }
  }

  @keyframes jump {
    0%,
    80%,
    100% {
      transform: scale(0);
      opacity: 0;
    }
    40% {
      transform: scale(1.75);
      opacity: 1;
    }
  }
</style>
