<script lang="ts">
  import Item from '$lib/components/ui/content/Item.svelte';
  import classNames from 'classnames';

  const headerClass = classNames(['flex flex-row items-center gap-3 animate-pulse']);
  const buttonClass = classNames(['w-10 h-10 bg-gray-300 rounded-md']);
  const infoClass = classNames(['flex flex-col flex-1 justify-around']);
  const titleClass = classNames(['bg-gray-300 rounded-md']);
  const metadataClass = classNames(['bg-gray-300 rounded-md']);
</script>

<Item>
  <div class={headerClass}>
    <div class="info {infoClass}">
      <span class="title {titleClass}" />
      <span class="metadata {metadataClass}" />
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
