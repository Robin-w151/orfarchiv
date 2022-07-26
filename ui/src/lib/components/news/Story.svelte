<script lang="ts">
  import classNames from 'classnames';
  import Item from '../ui/content/Item.svelte';
  import settings from '../../stores/settings';
  import getCategoryColorClass from '../../utils/categoryColorPalette';
  import { sources } from '../../models/settings';
  import { browser } from '$app/env';
  import { formatTimestamp } from '../../utils/datetime.js';

  export let title: string;
  export let category: string;
  export let url: string;
  export let timestamp: string;
  export let source: string;

  $: categoryColor = $settings.useCategoryColorPalette ? getCategoryColorClass(category) : undefined;
  $: target = $settings.openLinksInNewTab ? '_blank' : null;
  $: sourceLabel = getSourceLabel(source);

  const titleClass = classNames();
  const metadataClass = classNames(['text-sm', 'text-gray-600']);

  function getSourceLabel(source: string): string | undefined {
    if (!source || source === 'news') {
      return undefined;
    }
    return sources.find((s) => s.key === source)?.label;
  }
</script>

<Item href={url} {target} {categoryColor}>
  <span class={titleClass}>{title}</span>
  <span class={metadataClass}
    >{category}{#if sourceLabel}<span>&nbsp;({sourceLabel})</span>{/if} - {formatTimestamp(timestamp, browser)}</span
  >
</Item>
