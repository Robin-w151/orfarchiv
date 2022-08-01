<script lang="ts">
  import Item from '$lib/components/ui/content/Item.svelte';
  import classNames from 'classnames';

  const headerClass = classNames(['flex flex-row items-center gap-3 animate-pulse']);
  const buttonClass = classNames(['w-10 h-10 bg-gray-300 rounded-md']);
  const infoClass = classNames(['info flex flex-col flex-1 justify-around']);
  const titleClass = classNames(['title bg-gray-300 rounded-md']);
  const metadataClass = classNames(['metadata bg-gray-300 rounded-md']);
</script>

<Item>
  <div class={headerClass}>
    <div class={buttonClass} />
    <div class={infoClass}>
      <span class={titleClass} />
      <span class={metadataClass} />
    </div>
  </div>
</Item>

<style>
  .info {
    height: 44px;
  }

  .title {
    width: 85%;
    max-width: 500px;
    height: 16px;
  }

  .metadata {
    width: 55%;
    max-width: 300px;
    height: 14px;
  }
</style>
