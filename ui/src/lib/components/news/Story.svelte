<script lang="ts">
  import { DateTime } from 'luxon';
  import classNames from 'classnames';
  import Item from '../ui/content/Item.svelte';
  import settings from '../../stores/settings';
  import getCategoryColorClass from '../../utils/categoryColorPalette';

  export let title: string;
  export let category: string;
  export let url: string;
  export let timestamp: string;

  $: bgColor = $settings.useCategoryColorPalette ? getCategoryColorClass(category) : null;
  $: target = $settings.openLinksInNewTab ? '_blank' : null;

  const titleClass = classNames();
  const dateClass = classNames(['text-sm', 'text-gray-600']);

  function formatTimestamp(timestamp: string): string {
    return DateTime.fromISO(timestamp).toFormat('dd.MM.yyyy, HH:mm');
  }
</script>

<Item class={bgColor} href={url} {target}>
  <span class={titleClass}>{title}</span>
  <span class={dateClass}>{category} - {formatTimestamp(timestamp)}</span>
</Item>
