<script lang="ts">
  import { startSearch } from '$lib/stores/newsEvents';
  import { onMount } from 'svelte';

  onMount(() => {
    document.body.addEventListener('keydown', handleKeydown);
  });

  function handleKeydown(event: KeyboardEvent) {
    if (isSearchShortcut(event)) {
      event.preventDefault();
      startSearch.notify();
    }
  }

  function isSearchShortcut(event: KeyboardEvent) {
    const { key, metaKey, ctrlKey } = event;
    return (metaKey || ctrlKey) && key === 'k';
  }
</script>
