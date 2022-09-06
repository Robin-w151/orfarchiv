<script lang="ts">
  import Dropdown from '$lib/components/ui/controls/Dropdown.svelte';
  import classNames from 'classnames';
  import { formatTimestamp } from '$lib/utils/datetime.js';
  import EllipsisVerticalIcon from '$lib/components/ui/icons/outline/EllipsisVerticalIcon.svelte';
  import StoryMenu from '$lib/components/news/story/header/StoryMenu.svelte';
  import { sources } from '$lib/models/settings';

  export let title;
  export let category;
  export let url;
  export let timestamp;
  export let source;

  const infoClass = classNames(['flex flex-col flex-1 items-start', 'focus:text-blue-800', 'outline-none']);
  const metadataClass = classNames(['text-sm', 'text-gray-600']);

  let infoRef;

  $: sourceLabel = getSourceLabel(source);

  export function focus(): void {
    infoRef.focus();
  }

  function getSourceLabel(source: string): string | undefined {
    if (!source || source === 'news') {
      return undefined;
    }
    return sources.find((s) => s.key === source)?.label;
  }
</script>

<div class={infoClass} on:click on:keydown bind:this={infoRef} tabindex="0">
  <span>{title}</span>
  <span class={metadataClass}
    >{category}{#if sourceLabel}<span>&nbsp;({sourceLabel})</span>{/if} - {formatTimestamp(timestamp)}</span
  >
</div>
<Dropdown btnType="secondary" iconOnly placement="bottom-end" let:onClose>
  <EllipsisVerticalIcon slot="button" />
  <StoryMenu {url} {onClose} slot="content" />
</Dropdown>
