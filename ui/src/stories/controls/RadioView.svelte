<script>
  import Radio from '$lib/components/ui/controls/Radio.svelte';

  export let id;
  export let name;
  export let label;
  export let value;

  let group = `${value}-1`;
</script>

<fieldset class="flex flex-col gap-1">
  <Radio id="{id}-1" {name} label="{label} 1" value="{value}-1" bind:group on:change />
  <Radio id="{id}-2" {name} label="{label} 2" value="{value}-2" bind:group on:change />
  <Radio id="{id}-3" {name} label="{label} 3" value="{value}-3" bind:group on:change />
</fieldset>
