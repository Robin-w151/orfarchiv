<script lang="ts">
  const contentSkeletonClass = 'content-skeleton flex flex-col items-start w-full';
  const contentSkeletonBarClass = 'bg-gray-300 dark:bg-gray-600 rounded-sm animate-pulse';
</script>

<div class={contentSkeletonClass} data-testid="story-content-skeleton">
  <span class={contentSkeletonBarClass} />
  <span class={contentSkeletonBarClass} />
  <span class={contentSkeletonBarClass} />
  <span class={contentSkeletonBarClass} />
</div>

<style lang="scss">
  .content-skeleton {
    span {
      height: 16px;
      margin: 4px 0;
    }

    span:nth-child(1) {
      margin: calc(4px + 0.5rem) 0;
      width: 40%;
    }
    span:nth-child(2) {
      width: 95%;
    }
    span:nth-child(3) {
      width: 85%;
    }
    span:nth-child(4) {
      margin-bottom: calc(4px + 0.5rem);
      width: 90%;
    }
  }
</style>
