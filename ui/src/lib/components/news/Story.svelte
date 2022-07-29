<script lang="ts">
  import classNames from 'classnames';
  import Item from '../ui/content/Item.svelte';
  import settings from '../../stores/settings';
  import getCategoryColorClass from '../../utils/categoryColorPalette';
  import { sources } from '../../models/settings';
  import { browser } from '$app/env';
  import { formatTimestamp } from '../../utils/datetime.js';
  import ButtonLink from '../ui/controls/ButtonLink.svelte';
  import ChevronUp from '../ui/icons/outline/ChevronUp.svelte';
  import ChevronDown from '../ui/icons/outline/ChevronDown.svelte';
  import StoryContent from './StoryContent.svelte';

  export let id: string;
  export let title: string;
  export let category: string;
  export let url: string;
  export let timestamp: string;
  export let source: string;

  let showContent = false;

  $: categoryColor = $settings.useCategoryColorPalette ? getCategoryColorClass(category) : undefined;
  $: target = $settings.openLinksInNewTab ? '_blank' : null;
  $: sourceLabel = getSourceLabel(source);

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

  function handleToggleContentClick() {
    showContent = !showContent;
  }
</script>

<Item href={url} {target} {categoryColor}>
  <div class={headerClass}>
    <ButtonLink on:click={handleToggleContentClick} preventDefault>
      {#if showContent}
        <ChevronUp />
      {:else}
        <ChevronDown />
      {/if}
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
