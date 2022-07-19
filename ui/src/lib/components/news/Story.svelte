<script lang="ts">
  import { DateTime } from 'luxon';
  import classNames from 'classnames';

  export let title: string;
  export let url: string;
  export let timestamp: string;

  const storyClass = classNames(['flex flex-col', 'px-6 py-3', 'hover:bg-gray-100']);
  const storyTitleClass = classNames(['text-gray-800']);
  const storyDateClass = classNames(['text-sm', 'text-gray-600']);

  function formatTimestamp(timestamp: string): string {
    return DateTime.fromISO(timestamp).toFormat('dd.MM.yyyy, HH:mm');
  }
</script>

<a class={storyClass} href={url} target="_blank">
  <span class={storyTitleClass}>{title}</span>
  <span class={storyDateClass}>{formatTimestamp(timestamp)}</span>
</a>
