<script lang="ts">
  import classNames from 'classnames';

  export let href: string = undefined;
  export let target: string = undefined;

  const buttonClass = classNames([
    'p-2',
    'text-blue-800 hover:text-blue-700 hover:bg-gray-100',
    'outline-hidden focus:outline outline-2 outline-blue-700',
    'rounded-md hover:shadow-lg',
  ]);
</script>

{#if href}
  <a class={buttonClass} {href} {target}>
    <slot />
  </a>
{:else}
  <button class={buttonClass} on:click><slot /></button>
{/if}
