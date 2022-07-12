<script lang="ts">
  import classNames from 'classnames';
  import { DateTime } from 'luxon';

  export let id;
  export let title;
  export let url;
  export let timestamp;

  const storyClass = classNames(['flex flex-col', 'p-3', 'hover:bg-gray-100']);
  const storyTitleClass = classNames(['text-gray-800']);
  const storyDateClass = classNames(['text-sm', 'text-gray-600']);

  function formatTimestamp(timestamp) {
    return DateTime.fromISO(timestamp).toFormat('dd.MM.yyyy, HH:mm');
  }
</script>

<a class={storyClass} href={url} target="_blank">
  <span class={storyTitleClass}>{title}</span>
  <span class={storyDateClass}>{formatTimestamp(timestamp)}</span>
</a>
