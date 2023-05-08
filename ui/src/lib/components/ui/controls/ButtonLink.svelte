<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { preloadData } from '$app/navigation';
  import { buttonClassFn, type Size } from './button.styles';

  export let href: string;
  export let title: string;
  export let target: string | undefined = undefined;
  export let size: Size = 'normal';
  export let iconOnly = false;
  export let round = false;
  export let preventDefault = false;
  export let prefetch = false;

  const dispatch = createEventDispatcher();

  const buttonClass = buttonClassFn({
    btnType: 'secondary',
    size,
    iconOnly,
    round,
    clazz: $$props['class'],
  });

  function triggerPrefetchRoute(): void {
    if (prefetch) {
      preloadData(href);
    }
  }

  function handleClick(event: Event): void {
    if (preventDefault) {
      event.preventDefault();
    }
    dispatch('click');
  }

  function handleFocus(): void {
    triggerPrefetchRoute();
  }

  function handleMouseOver(): void {
    triggerPrefetchRoute();
  }
</script>

<a
  class={buttonClass}
  {href}
  {target}
  {title}
  on:click={handleClick}
  on:focus={handleFocus}
  on:mouseover={handleMouseOver}
>
  <slot />
</a>
