<script lang="ts">
  import classNames from 'classnames';

  const contentSkeletonClass = classNames([
    'content-skeleton',
    'flex flex-col items-start gap-2',
    'mt-1 mb-2',
    'w-full',
  ]);
  const contentSkeletonBarClass = classNames(['h-4', 'bg-gray-300', 'rounded-md animate-pulse']);
</script>

<div class={contentSkeletonClass} data-testid="story-content-skeleton">
  <span class={contentSkeletonBarClass} />
  <span class={contentSkeletonBarClass} />
  <span class={contentSkeletonBarClass} />
  <span class={contentSkeletonBarClass} />
</div>

<style lang="scss">
  .content-skeleton {
    span:nth-child(1) {
      margin-bottom: 0.75rem;
      width: 40%;
    }
    span:nth-child(2) {
      width: 95%;
    }
    span:nth-child(3) {
      width: 85%;
    }
    span:nth-child(4) {
      width: 90%;
    }
  }
</style>
