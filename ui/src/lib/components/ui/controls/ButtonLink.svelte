<script lang="ts">
  import classNames from 'classnames';

  export let href: string | undefined = undefined;
  export let target: string | undefined = undefined;

  const buttonClass = classNames([
    'p-2',
    'text-blue-800 hover:text-blue-600 hover:bg-gray-100',
    'outline-hidden focus:outline outline-2 outline-blue-800',
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
