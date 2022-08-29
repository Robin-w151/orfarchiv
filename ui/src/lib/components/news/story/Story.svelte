<script lang="ts">
  import classNames from 'classnames';
  import Item from '$lib/components/ui/content/Item.svelte';
  import { sources } from '$lib/models/settings';
  import { browser } from '$app/env';
  import { formatTimestamp } from '$lib/utils/datetime.js';
  import { fade } from 'svelte/transition';
  import { defaultPadding } from '$lib/utils/styles';
  import StoryContent from '$lib/components/news/story/StoryContent.svelte';
  import Dropdown from '$lib/components/ui/controls/Dropdown.svelte';
  import EllipsisVerticalIcon from '$lib/components/ui/icons/outline/EllipsisVerticalIcon.svelte';
  import StoryMenu from '$lib/components/news/story/StoryMenu.svelte';

  export let title: string;
  export let category: string;
  export let url: string;
  export let timestamp: string;
  export let source: string;

  let itemRef;
  let showContentInitial = false;
  let showContent = false;

  $: sourceLabel = getSourceLabel(source);
  $: handleContentViewCollapse(showContent);

  $: storyClass = classNames();
  $: headerClass = classNames([
    'flex flex-row items-center gap-3',
    defaultPadding,
    showContent && 'sticky z-10 border-solid border-b-2 bg-white',
  ]);
  $: infoClass = classNames([
    'flex flex-col flex-1 items-start',
    'hover:text-blue-800 focus:text-blue-800',
    'outline-none cursor-default',
  ]);
  $: titleClass = classNames();
  $: metadataClass = classNames(['text-sm', 'text-gray-600']);
  $: contentClass = classNames([defaultPadding]);

  function getSourceLabel(source: string): string | undefined {
    if (!source || source === 'news') {
      return undefined;
    }
    return sources.find((s) => s.key === source)?.label;
  }

  function toggleShowContent(): void {
    showContent = !showContent;
  }

  function handleContentViewCollapse(showContent: boolean): void {
    if (showContentInitial && !showContent) {
      itemRef.scrollIntoView();
    }

    if (!showContentInitial) {
      showContentInitial = true;
    }
  }

  function handleStoryContentCollapse(): void {
    toggleShowContent();
  }

  function handleItemClick(): void {
    toggleShowContent();
  }

  function handleItemKeydown(event: Event): void {
    const code = (event as any).code;
    if (code === 'Enter' || code === 'Space') {
      event.preventDefault();
      toggleShowContent();
    }
  }
</script>

<Item class={storyClass} bind:this={itemRef} noGap noPadding>
  <div class="header {headerClass}">
    <div class={infoClass} on:click={handleItemClick} on:keydown={handleItemKeydown} tabindex="0">
      <span class={titleClass}>{title}</span>
      <span class={metadataClass}
        >{category}{#if sourceLabel}<span>&nbsp;({sourceLabel})</span>{/if} - {formatTimestamp(
          timestamp,
          browser,
        )}</span
      >
    </div>
    <Dropdown btnType="secondary" iconOnly placement="bottom-end" let:onClose>
      <EllipsisVerticalIcon slot="button" />
      <StoryMenu {url} {onClose} slot="content" />
    </Dropdown>
  </div>
  {#if showContent}
    <div class="content {contentClass}" in:fade={{ duration: 200 }}>
      <StoryContent {url} on:collapse={handleStoryContentCollapse} />
    </div>
  {/if}
</Item>

<style lang="scss">
  .header {
    top: 46px;

    @screen sm {
      top: 54px;
    }

    &.sticky {
      margin-bottom: -2px;
    }
  }

  .content {
    margin-top: 2px;
  }
</style>
