<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let value = '';

  const dispatch = createEventDispatcher();

  const inputClass = `
    flex-1 w-full
    text-gray-900 bg-gray-100 focus:bg-white
    focus:ring-0
    focus:outline-none focus:ring-2 focus:ring-blue-700
    rounded-md text-center
    transition
  `;

  let inputRef;

  $: dispatch('change', value);

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      inputRef.blur();
    }
  }
</script>

<input class={inputClass} type="date" {id} on:keydown={handleKeydown} bind:value bind:this={inputRef} />
