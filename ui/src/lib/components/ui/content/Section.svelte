<script lang="ts">
  import classNames from 'classnames';

  export let title: string;

  const titleClass = classNames([
    'flex justify-center sticky top-2',
    'px-3 py-2',
    'w-48',
    'text-blue-900 bg-white',
    'rounded-lg shadow-md',
  ]);
</script>

{#if title}
  <div class={titleClass}>{title}</div>
{/if}
<slot />
