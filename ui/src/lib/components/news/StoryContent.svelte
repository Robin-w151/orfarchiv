<script lang="ts">
  import { onMount } from 'svelte';

  export let id: string;
  export let url: string;

  let content;

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
  {@html content}
{/if}
