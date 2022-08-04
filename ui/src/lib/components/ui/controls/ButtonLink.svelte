<script lang="ts">
  import classNames from 'classnames';
  import { createEventDispatcher } from 'svelte';

  export let href: string;
  export let title: string;
  export let target: string | undefined = undefined;
  export let preventDefault = false;

  const dispatch = createEventDispatcher();

  const buttonClass = classNames([
    'p-2',
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

<a class={buttonClass} {href} {target} {title} on:click={handleClick}>
  <slot />
</a>
