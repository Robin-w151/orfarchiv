<script lang="ts">
  import classNames from 'classnames';
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let value = '';
  export let placeholder: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  $: dispatch('change', value);

  const inputClass = classNames([
    'w-full',
    'text-gray-900 bg-gray-100 focus:bg-white',
    'focus:ring-0',
    'outline-hidden focus:outline outline-2 focus:outline-offset-0 focus:outline-blue-800',
    'rounded-md',
  ]);
</script>

<input class={inputClass} {id} type="text" bind:value {placeholder} />
