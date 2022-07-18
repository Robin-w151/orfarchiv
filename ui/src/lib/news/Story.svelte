<script lang="ts">
  import { DateTime } from 'luxon';
  import { storyClass, storyTitleClass, storyDateClass } from './Story.styles';

  export let title: string;
  export let url: string;
  export let timestamp: string;

  function formatTimestamp(timestamp: string): string {
    return DateTime.fromISO(timestamp).toFormat('dd.MM.yyyy, HH:mm');
  }
</script>

<a class={storyClass} href={url} target="_blank">
  <span class={storyTitleClass}>{title}</span>
  <span class={storyDateClass}>{formatTimestamp(timestamp)}</span>
</a>
