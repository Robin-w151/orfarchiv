<script lang="ts">
  import classNames from 'classnames';

  export let title: string;

  const sectionClass = classNames(['flex flex-col items-center', 'w-full']);
  const titleClass = classNames([
    'flex justify-center sticky top-2',
    'mb-3 px-3 py-2',
    'w-48',
    'text-blue-900 bg-white',
    'rounded-lg shadow-md',
  ]);
</script>

<div class={sectionClass}>
  {#if title}
    <div class={titleClass}>{title}</div>
  {/if}
  <slot />
</div>
