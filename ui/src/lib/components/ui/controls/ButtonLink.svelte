<script lang="ts">
  import classNames from 'classnames';
  import { createEventDispatcher } from 'svelte';

  export let href: string | undefined = undefined;
  export let target: string | undefined = undefined;
  export let preventDefault = false;

  const dispatch = createEventDispatcher();

  const buttonClass = classNames([
    'p-2 w-10 h-10',
    'text-blue-800 hover:text-blue-600 hover:bg-blue-100',
    'outline-hidden focus:outline outline-2 outline-blue-800',
    'rounded-md hover:shadow-lg',
  ]);

  function handleClick(event: Event): void {
    if (preventDefault) {
      event.preventDefault();
    }
    dispatch('click');
  }
</script>

{#if href}
  <a class={buttonClass} {href} {target} on:click={handleClick}>
    <slot />
  </a>
{:else}
  <button class={buttonClass} on:click={handleClick}><slot /></button>
{/if}
