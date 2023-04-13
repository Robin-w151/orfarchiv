<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let value: string | null | undefined = '';

  const dispatch = createEventDispatcher();

  const inputClass = `
    flex-1 w-full
    text-gray-800 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900
    focus:ring-0
    focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500
    rounded-md text-center
    transition
  `;

  let inputRef: HTMLInputElement;

  $: dispatch('change', value);

  export function focus() {
    inputRef.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      inputRef.blur();
    }
  }
</script>

<input class={inputClass} type="date" {id} on:keydown={handleKeydown} bind:value bind:this={inputRef} />
