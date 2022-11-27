<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { inputClass, labelClass, wrapperClass } from './toggleInput.styles';

  export let id: string;
  export let name: string;
  export let label: string;
  export let checked = false;

  const dispatch = createEventDispatcher();

  function handleChange() {
    dispatch('change');
  }
</script>

<span class={wrapperClass}>
  <input class={inputClass} {id} {name} type="radio" {checked} on:change={handleChange} />
  <label class={labelClass} for={id}>{label}</label>
</span>
