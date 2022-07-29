<script lang="ts">
  import { onMount } from 'svelte';
  import ChevronUp from '../ui/icons/outline/ChevronUp.svelte';
  import classNames from 'classnames';

  export let id: string;
  export let url: string;

  let content;

  const contentClass = classNames('cursor-default');
  const collapseContentClass = classNames('flex justify-center cursor-pointer');

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
</script>

{#if content}
  <div class={contentClass} on:click|stopPropagation>
    {@html content}
  </div>
  <div class={collapseContentClass}>
    <ChevronUp />
  </div>
{/if}
