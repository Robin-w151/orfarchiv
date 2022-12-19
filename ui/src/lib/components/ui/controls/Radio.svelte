<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { inputClass, labelClass, wrapperClass } from './checkbox.styles';

  export let id: string;
  export let name: string;
  export let label: string;
  export let value: string;
  export let group: string;

  const dispatch = createEventDispatcher();

  function handleChange() {
    dispatch('change', value);
  }
</script>

<span class={wrapperClass}>
  <input class={inputClass} type="radio" {id} {name} {value} bind:group on:change={handleChange} />
  <label class={labelClass} for={id}>{label}</label>
</span>
