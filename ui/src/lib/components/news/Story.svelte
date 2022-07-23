<script lang="ts">
  import { DateTime } from 'luxon';
  import classNames from 'classnames';
  import Item from '../ui/content/Item.svelte';
  import settings from '../../stores/settings';
  import getCategoryColorClass from '../../utils/categoryColorPalette';
  import { sources } from '../../models/settings';

  export let title: string;
  export let category: string;
  export let url: string;
  export let timestamp: string;
  export let source: string;

  $: categoryColor = $settings.useCategoryColorPalette ? getCategoryColorClass(category) : null;
  $: target = $settings.openLinksInNewTab ? '_blank' : null;
  $: sourceLabel = getSourceLabel(source);

  const titleClass = classNames();
  const metadataClass = classNames(['text-sm', 'text-gray-600']);

  function formatTimestamp(timestamp: string): string {
    return DateTime.fromISO(timestamp).toFormat('dd.MM.yyyy, HH:mm');
  }

  function getSourceLabel(source: string): string {
    if (!source || source === 'news') {
      return undefined;
    }
    return sources.find((s) => s.key === source)?.label;
  }
</script>

<Item href={url} {target} {categoryColor}>
  <span class={titleClass}>{title}</span>
  <span class={metadataClass}
    >{#if sourceLabel}<span>{sourceLabel} - </span>{/if}{category} - {formatTimestamp(timestamp)}</span
  >
</Item>
