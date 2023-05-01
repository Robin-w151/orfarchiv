<script>
  import Button from '$lib/components/ui/controls/Button.svelte';
  import NewspaperIcon from '$lib/components/ui/icons/outline/NewspaperIcon.svelte';
</script>

<span class="inline-block p-4 bg-white dark:bg-gray-900 rounded-md">
  <Button {...$$props} on:click on:keydown>
    {#if $$props['iconOnly']}
      <NewspaperIcon />
    {:else}
      <span>Button</span>
    {/if}
  </Button>
</span>
