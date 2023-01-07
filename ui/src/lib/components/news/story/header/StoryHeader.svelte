<script lang="ts">
  import { formatTimestamp } from '$lib/utils/datetime.js';
  import { getSourceLabel } from '$lib/models/settings';
  import type { Story } from '$lib/models/story';
  import EyeIcon from '$lib/components/ui/icons/outline/EyeIcon.svelte';
  import StoryPopover from '$lib/components/news/story/header/options/StoryPopover.svelte';

  export let story: Story;

  const infoClass = `
    flex flex-col flex-1 items-start
    focus:text-blue-700 dark:focus:text-blue-500
    outline-none
  `;
  const metadataClass = 'flex flex-wrap items-center gap-x-1 text-sm text-gray-600 dark:text-gray-400';
  const viewedIconClass = 'w-5 h-5';

  $: showViewedIcon = story?.isBookmarked && story?.isViewed;
  $: sourceLabel = getSourceLabel(story?.source);
</script>

{#if story}
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <header class={infoClass} on:click on:keydown tabindex="0">
    <h3>{story.title}</h3>
    <span class={metadataClass}>
      {#if showViewedIcon}
        <EyeIcon class={viewedIconClass} />
      {/if}
      <span>{story.category ?? 'Keine Kategorie'}</span>
      {#if sourceLabel}<span>({sourceLabel})</span>{/if}
      <span>{formatTimestamp(story.timestamp)}</span></span
    >
  </header>
  <StoryPopover {story} />
{/if}
