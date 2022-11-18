<script lang="ts">
  import { formatTimestamp } from '$lib/utils/datetime.js';
  import EllipsisVerticalIcon from '$lib/components/ui/icons/outline/EllipsisVerticalIcon.svelte';
  import StoryMenu from '$lib/components/news/story/header/menu/StoryMenu.svelte';
  import { sources } from '$lib/models/settings';
  import Popover from '$lib/components/ui/controls/Popover.svelte';
  import type { Story } from '$lib/models/story';

  export let story: Story;

  const infoClass = `
    flex flex-col flex-1 items-start
    focus:text-blue-700 dark:focus:text-blue-500
    outline-none
  `;
  const metadataClass = 'text-sm text-gray-600 dark:text-gray-400';

  $: sourceLabel = getSourceLabel(story?.source);

  function getSourceLabel(source: string): string | undefined {
    if (!source || source === 'news') {
      return undefined;
    }
    return sources.find((s) => s.key === source)?.label;
  }
</script>

{#if story}
  <header class={infoClass} on:click on:keydown tabindex="0">
    <h3>{story.title}</h3>
    <span class={metadataClass}>
      <span>{story.category ?? 'Keine Kategorie'}</span>
      {#if sourceLabel}<span>({sourceLabel})</span>{/if}
      <span> - {formatTimestamp(story.timestamp)}</span></span
    >
  </header>
  <Popover btnType="secondary" iconOnly title="Weitere Optionen" placement="bottom-end" let:onClose>
    <EllipsisVerticalIcon slot="button-content" />
    <StoryMenu {story} {onClose} slot="content" />
  </Popover>
{/if}
