<script lang="ts">
  import { formatTimestamp } from '$lib/utils/datetime.js';
  import EllipsisVerticalIcon from '$lib/components/ui/icons/outline/EllipsisVerticalIcon.svelte';
  import StoryMenu from '$lib/components/news/story/header/StoryMenu.svelte';
  import { sources } from '$lib/models/settings';
  import Popover from '$lib/components/ui/controls/Popover.svelte';

  export let title;
  export let category;
  export let url;
  export let timestamp;
  export let source;

  const infoClass = `
    flex flex-col flex-1 items-start
    focus:text-blue-700 dark:focus:text-blue-500
    outline-none
  `;
  const metadataClass = 'text-sm text-gray-600 dark:text-gray-400';

  $: sourceLabel = getSourceLabel(source);

  function getSourceLabel(source: string): string | undefined {
    if (!source || source === 'news') {
      return undefined;
    }
    return sources.find((s) => s.key === source)?.label;
  }
</script>

<header class={infoClass} on:click on:keydown tabindex="0">
  <h3>{title}</h3>
  <span class={metadataClass}>
    <span>{category ?? 'Keine Kategorie'}</span>
    {#if sourceLabel}<span>({sourceLabel})</span>{/if}
    <span> - {formatTimestamp(timestamp)}</span></span
  >
</header>
<Popover btnType="secondary" iconOnly title="Weitere Optionen" placement="bottom-end" let:onClose>
  <EllipsisVerticalIcon slot="button-content" />
  <StoryMenu {url} {onClose} slot="content" />
</Popover>
