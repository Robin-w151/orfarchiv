<script lang="ts">
  import classNames from 'classnames';
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let label: string;
  export let checked = false;

  const dispatch = createEventDispatcher();

  const wrapperClass = classNames(['inline-flex items-center gap-3']);
  const inputClass = classNames(['text-blue-800', 'rounded-md']);
  const labelClass = classNames(['flex-1']);

  function handleChange(event: Event) {
    dispatch('change', (event.target as HTMLInputElement).checked);
  }
</script>

<span class={wrapperClass}>
  <input class={inputClass} {id} type="checkbox" {checked} on:change={handleChange} />
  <label class={labelClass} for={id}>{label}</label>
</span>
