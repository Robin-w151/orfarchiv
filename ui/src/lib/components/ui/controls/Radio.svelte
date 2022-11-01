<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let name: string;
  export let label: string;
  export let checked = false;

  const dispatch = createEventDispatcher();

  const wrapperClass = `inline-flex items-center gap-3`;
  const inputClass = `
    text-blue-700 dark:text-blue-500 focus:ring-blue-700 dark:focus:ring-blue-500
    rounded-md transition
  `;
  const labelClass = `flex-1`;

  function handleChange() {
    dispatch('change');
  }
</script>

<span class={wrapperClass}>
  <input class={inputClass} {id} {name} type="radio" {checked} on:change={handleChange} />
  <label class={labelClass} for={id}>{label}</label>
</span>
