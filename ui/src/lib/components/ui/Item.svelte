<script lang="ts">
  import classNames from 'classnames';

  export let href: string;

  const itemClass = classNames(['flex flex-col', 'px-6 py-3', 'hover:bg-gray-100']);
</script>

{#if href}
  <a {href} class={itemClass}>
    <slot />
  </a>
{:else}
  <div class={itemClass}>
    <slot />
  </div>
{/if}
