<script lang="ts">
  import classNames from 'classnames';
  import { createEventDispatcher } from 'svelte';
  import XIcon from '$lib/components/ui/icons/outline/XIcon.svelte';

  export let id: string;
  export let value = '';
  export let placeholder: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  let inputRef;

  $: dispatch('change', value);
  $: showClearButton = !!value;

  const wrapperClass = classNames(['flex items-center relative']);
  const inputClass = classNames([
    'pr-12 w-full',
    'text-gray-900 bg-gray-100 focus:bg-white',
    'focus:ring-0',
    'outline-hidden focus:outline outline-2 focus:outline-offset-0 focus:outline-blue-800',
    'rounded-md',
  ]);
  const clearButtonClass = classNames([
    'absolute right-2',
    'p-1',
    'text-gray-700 hover:bg-gray-200',
    'outline-hidden focus:outline outline-2 focus:outline-blue-800',
    'rounded-full',
  ]);

  export function focus() {
    inputRef.focus();
  }

  function handleClearButtonClick() {
    value = '';
    dispatch('clear');
    inputRef.focus();
  }
</script>

<div class={wrapperClass}>
  <input class={inputClass} {id} type="text" bind:value bind:this={inputRef} {placeholder} maxlength="256" />
  {#if showClearButton}
    <button class={clearButtonClass} on:click={handleClearButtonClick}>
      <XIcon />
    </button>
  {/if}
</div>
