<script lang="ts">
  import Item from '$lib/components/ui/content/Item.svelte';

  const headerClass = 'flex flex-row items-center gap-3 animate-pulse';
  const buttonClass = 'w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-md';
  const infoClass = 'flex flex-col flex-1 justify-around';
  const textClass = 'bg-gray-300 dark:bg-gray-600 rounded-sm';
</script>

<Item>
  <div class={headerClass}>
    <div class="info {infoClass}">
      <span class="title {textClass}" />
      <span class="metadata {textClass}" />
    </div>
    <div class={buttonClass} />
  </div>
</Item>

<style>
  .info {
    height: 44px;
  }

  .title {
    width: 85%;
    max-width: 600px;
    height: 16px;
  }

  .metadata {
    width: 55%;
    max-width: 400px;
    height: 14px;
  }
</style>
