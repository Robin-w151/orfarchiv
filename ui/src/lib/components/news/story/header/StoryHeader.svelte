<script lang="ts">
  import { formatTimestamp } from '$lib/utils/datetime.js';
  import { getSourceLabel } from '$lib/models/settings';
  import type { Story } from '$lib/models/story';
  import StoryPopover from '$lib/components/news/story/header/options/StoryPopover.svelte';

  export let story: Story;

  const infoClass = `
    flex flex-col flex-1 items-start
    focus:text-blue-700 dark:focus:text-blue-500
    outline-none
  `;
  const titleClass = 'flex items-center gap-2';
  const metadataClass = 'flex flex-wrap items-center gap-x-1 text-sm text-gray-600 dark:text-gray-400';
  const viewedBadge = `
    px-1 py-px
    text-sm
    bg-blue-700 text-white
    rounded-sm
  `;

  $: showViewedInfo = story?.isBookmarked && story?.isViewed;
  $: sourceLabel = getSourceLabel(story?.source);
</script>

{#if story}
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <header class={infoClass} on:click on:keydown tabindex="0">
    <h3 class={titleClass}>
      <span>{story.title}</span>
      {#if showViewedInfo}
        <span class={viewedBadge}>Gelesen</span>
      {/if}
    </h3>
    <span class={metadataClass}>
      <span>{story.category ?? 'Keine Kategorie'}</span>
      {#if sourceLabel}<span>({sourceLabel})</span>{/if}
      <span>{formatTimestamp(story.timestamp)}</span></span
    >
  </header>
  <StoryPopover {story} />
{/if}
