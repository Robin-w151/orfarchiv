<script lang="ts">
  import classNames from 'classnames';

  export let title: string;

  const sectionClass = classNames(['flex flex-col items-center', 'w-full']);
  const titleClass = classNames([
    'flex justify-center sticky top-0',
    'px-3 sm:px-6 py-3',
    'w-full text-lg',
    'text-blue-900 bg-white',
    'border-solid border-b-2',
    'rounded-t-lg',
  ]);
  const contentClass = classNames(['w-full', 'overflow-hidden', 'rounded-b-lg']);
</script>

<div class={sectionClass}>
  {#if title}
    <h2 class={titleClass}>{title}</h2>
  {/if}
  <div class={contentClass}>
    <slot />
  </div>
</div>
