<script lang="ts">
  import classNames from 'classnames';

  export let href: string;
  export let target = '_blank';

  const itemClass = classNames([
    'flex flex-col',
    'px-6 py-3',
    'text-gray-800',
    href && 'hover:bg-gray-100',
    $$props.class,
  ]);
</script>

{#if href}
  <a {href} {target} class={itemClass}>
    <slot />
  </a>
{:else}
  <div class={itemClass}>
    <slot />
  </div>
{/if}
