<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { inputClass, labelClass, wrapperClass } from './checkbox.styles';

  export let id: string;
  export let label: string;
  export let checked = false;

  const dispatch = createEventDispatcher();

  function handleChange(event: Event) {
    dispatch('change', (event.target as HTMLInputElement).checked);
  }
</script>

<span class={wrapperClass}>
  <input class={inputClass} {id} type="checkbox" {checked} on:change={handleChange} />
  <label class={labelClass} for={id}>{label}</label>
</span>
