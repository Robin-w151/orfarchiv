<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let label: string;
  export let checked = false;

  const dispatch = createEventDispatcher();

  const wrapperClass = `inline-flex items-center gap-3`;
  const inputClass = `
    text-blue-700 dark:text-blue-500 focus:ring-blue-700 dark:focus:ring-blue-500
    rounded-md transition
  `;
  const labelClass = `flex-1`;

  function handleChange(event: Event) {
    dispatch('change', (event.target as HTMLInputElement).checked);
  }
</script>

<span class={wrapperClass}>
  <input class={inputClass} {id} type="checkbox" {checked} on:change={handleChange} />
  <label class={labelClass} for={id}>{label}</label>
</span>
