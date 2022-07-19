<script lang="ts">
  import { DateTime } from 'luxon';
  import classNames from 'classnames';
  import Item from '../ui/content/Item.svelte';

  export let title: string;
  export let url: string;
  export let timestamp: string;

  const titleClass = classNames(['text-gray-800']);
  const dateClass = classNames(['text-sm', 'text-gray-600']);

  function formatTimestamp(timestamp: string): string {
    return DateTime.fromISO(timestamp).toFormat('dd.MM.yyyy, HH:mm');
  }
</script>

<Item href={url}>
  <span class={titleClass}>{title}</span>
  <span class={dateClass}>{formatTimestamp(timestamp)}</span>
</Item>
