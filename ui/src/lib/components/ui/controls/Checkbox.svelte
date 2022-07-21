<script lang="ts">
  import classNames from 'classnames';
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let label: string;
  export let checked = false;

  const dispatch = createEventDispatcher();

  const wrapperClass = classNames(['inline-flex items-center gap-3']);
  const labelClass = classNames(['flex-1']);

  function handleChange(event) {
    dispatch('change', event.target.checked);
  }
</script>

<span class={wrapperClass}>
  <input {id} type="checkbox" {checked} on:change={handleChange} />
  <label class={labelClass} for={id}>{label}</label>
</span>
