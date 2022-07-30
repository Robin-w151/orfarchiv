<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import ChevronUp from '../ui/icons/outline/ChevronUp.svelte';
  import classNames from 'classnames';

  export let id: string;
  export let url: string;

  const dispatch = createEventDispatcher();

  let content;

  const contentClass = classNames('cursor-auto');
  const collapseContentClass = classNames([
    'flex justify-center',
    'hover:text-blue-800 focus:text-blue-800',
    'outline-none',
  ]);

  onMount(async () => {
    try {
      const response = await fetch(`/news/${id}?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('Failed to load story content!');
      }
      content = await response.text();
    } catch (error) {
      console.warn(`Error: ${error.message}`);
    }
  });

  function handleCollapseFieldClick(): void {
    dispatch('collapse');
  }

  function handleCollapseFieldKeydown(event: Event): void {
    const code = (event as any).code;
    if (code === 'Enter' || code === 'Space') {
      event.preventDefault();
      dispatch('collapse');
    }
  }
</script>

{#if content}
  <div class={contentClass} on:click|stopPropagation>
    {@html content}
  </div>
  <div
    class={collapseContentClass}
    on:click={handleCollapseFieldClick}
    on:keydown={handleCollapseFieldKeydown}
    tabindex="0"
  >
    <ChevronUp />
  </div>
{/if}
