<script lang="ts">
  import classNames from 'classnames';

  const loadingIndicatorClass = classNames(['flex justify-center items-center gap-2', $$props['class']]);
  const dotClass = classNames(['w-2 h-2', 'bg-blue-800', 'rounded-full']);
</script>

<div class="loading-indicator {loadingIndicatorClass}">
  <div class="dot-1 {dotClass}" />
  <div class="dot-2 {dotClass}" />
  <div class="dot-3 {dotClass}" />
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
