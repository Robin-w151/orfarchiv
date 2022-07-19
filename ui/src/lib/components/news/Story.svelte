<script lang="ts">
  import { DateTime } from 'luxon';
  import classNames from 'classnames';
  import Item from '../ui/content/Item.svelte';
  import settings from '../../stores/settings';

  export let title: string;
  export let url: string;
  export let timestamp: string;

  $: target = $settings.openLinksInNewTab ? '_blank' : null;

  const titleClass = classNames();
  const dateClass = classNames(['text-sm', 'text-gray-600']);

  function formatTimestamp(timestamp: string): string {
    return DateTime.fromISO(timestamp).toFormat('dd.MM.yyyy, HH:mm');
  }
</script>

<Item href={url} {target}>
  <span class={titleClass}>{title}</span>
  <span class={dateClass}>{formatTimestamp(timestamp)}</span>
</Item>
