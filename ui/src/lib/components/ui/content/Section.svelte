<script lang="ts">
  import classNames from 'classnames';
  import { defaultPadding } from '$lib/utils/styles';

  export let title: string;

  const sectionClass = classNames(['flex flex-col items-center', 'w-full', 'rounded-lg overflow-clip']);
  const titleClass = classNames([
    'flex justify-center sticky top-0 z-10',
    defaultPadding,
    'w-full text-lg',
    'text-blue-900 bg-white',
    'border-solid border-b-2',
  ]);
  const contentClass = classNames(['w-full']);
</script>

<div class="section {sectionClass}">
  {#if title}
    <h2 class={titleClass}>{title}</h2>
  {/if}
  <div class={contentClass}>
    <slot />
  </div>
</div>

<style lang="scss">
  .section {
  }
</style>
