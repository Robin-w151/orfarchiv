<script lang="ts">
  import classNames from 'classnames';
  import Item from '../ui/content/Item.svelte';
  import settings from '../../stores/settings';
  import getCategoryColorClass from '../../utils/categoryColorPalette';
  import { sources } from '../../models/settings';
  import { browser } from '$app/env';
  import { formatTimestamp } from '../../utils/datetime.js';
  import ButtonLink from '../ui/controls/ButtonLink.svelte';
  import StoryContent from './StoryContent.svelte';
  import ExternalLink from '../ui/icons/outline/ExternalLink.svelte';

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
  $: scrollStoryIntoView(showContent);

  const storyClass = classNames('cursor-pointer');
  const headerClass = classNames('flex flex-row items-center gap-3');
  const infoClass = classNames('flex flex-col');
  const titleClass = classNames();
  const metadataClass = classNames(['text-sm', 'text-gray-600']);

  function getSourceLabel(source: string): string | undefined {
    if (!source || source === 'news') {
      return undefined;
    }
    return sources.find((s) => s.key === source)?.label;
  }

  function scrollStoryIntoView(showContent: boolean): void {
    if (showContentInitial && !showContent) {
      itemRef.scrollIntoView();
    }

    if (!showContentInitial) {
      showContentInitial = true;
    }
  }

  function toggleShowContent(): void {
    showContent = !showContent;
  }

  function handleItemClick(): void {
    toggleShowContent();
  }

  function handleItemKeydown(event: Event): void {
    const code = (event as any).code;
    if (code === 'Enter' || code === 'Space') {
      toggleShowContent();
    }
  }
</script>

<Item class={storyClass} {categoryColor} on:click={handleItemClick} on:keydown={handleItemKeydown} bind:this={itemRef}>
  <div class={headerClass}>
    <ButtonLink href={url} target="_blank">
      <ExternalLink />
    </ButtonLink>
    <div class={infoClass}>
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
    <StoryContent {id} {url} />
  {/if}
</Item>
