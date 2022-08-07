<script lang="ts">
  import classNames from 'classnames';
  import Item from '$lib/components/ui/content/Item.svelte';
  import settings from '$lib/stores/settings';
  import getCategoryColorClass from '$lib/utils/categoryColorPalette';
  import { sources } from '$lib/models/settings';
  import { browser } from '$app/env';
  import { formatTimestamp } from '$lib/utils/datetime.js';
  import ButtonLink from '$lib/components/ui/controls/ButtonLink.svelte';
  import StoryContent from './StoryContent.svelte';
  import ExternalLink from '$lib/components/ui/icons/outline/ExternalLink.svelte';
  import { fade } from 'svelte/transition';
  import { defaultPadding } from '$lib/utils/styles';

  export let id: string;
  export let title: string;
  export let category: string;
  export let url: string;
  export let timestamp: string;
  export let source: string;

  let itemRef;
  let showContentInitial = false;
  let showContent = false;

  $: categoryColor = $settings.useCategoryColorPalette ? getCategoryColorClass(category) : undefined;
  $: sourceLabel = getSourceLabel(source);
  $: handleContentViewCollapse(showContent);

  $: storyClass = classNames(['gap-0', 'px-0 sm:px-0 py-0']);
  $: headerClass = classNames([
    'flex flex-row items-center gap-3',
    defaultPadding,
    showContent && 'sticky border-solid border-b-2 bg-white',
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

<Item class={storyClass} {categoryColor} bind:this={itemRef}>
  <div class="header {headerClass}">
    <ButtonLink href={url} target="_blank" title="Link zum Artikel">
      <ExternalLink />
    </ButtonLink>
    <div class={infoClass} on:click={handleItemClick} on:keydown={handleItemKeydown} tabindex="0">
      <span class={titleClass}>{title}</span>
      <span class={metadataClass}
        >{category}{#if sourceLabel}<span>&nbsp;({sourceLabel})</span>{/if} - {formatTimestamp(
          timestamp,
          browser,
        )}</span
      >
    </div>
  </div>
  {#if showContent}
    <div class="content {contentClass}" in:fade={{ duration: 200 }}>
      <StoryContent {id} {url} on:collapse={handleStoryContentCollapse} />
    </div>
  {/if}
</Item>

<style lang="scss">
  .header {
    top: 54px;

    &.sticky {
      margin-bottom: -2px;
    }
  }

  .content {
    margin-top: 2px;
  }
</style>
