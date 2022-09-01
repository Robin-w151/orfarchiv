<script lang="ts">
  import Dropdown from '$lib/components/ui/controls/Dropdown.svelte';
  import classNames from 'classnames';
  import { formatTimestamp } from '$lib/utils/datetime.js';
  import { browser } from '$app/env';
  import EllipsisVerticalIcon from '$lib/components/ui/icons/outline/EllipsisVerticalIcon.svelte';
  import StoryMenu from '$lib/components/news/story/header/StoryMenu.svelte';
  import { sources } from '$lib/models/settings';

  export let title;
  export let category;
  export let url;
  export let timestamp;
  export let source;

  $: sourceLabel = getSourceLabel(source);

  const infoClass = classNames(['flex flex-col flex-1 items-start']);
  const titleClass = classNames();
  const metadataClass = classNames(['text-sm', 'text-gray-600']);

  function getSourceLabel(source: string): string | undefined {
    if (!source || source === 'news') {
      return undefined;
    }
    return sources.find((s) => s.key === source)?.label;
  }
</script>

<div class={infoClass} on:click>
  <span class={titleClass}>{title}</span>
  <span class={metadataClass}
    >{category}{#if sourceLabel}<span>&nbsp;({sourceLabel})</span>{/if} - {formatTimestamp(timestamp, browser)}</span
  >
</div>
<Dropdown btnType="secondary" iconOnly placement="bottom-end" let:onClose>
  <EllipsisVerticalIcon slot="button" />
  <StoryMenu {url} {onClose} slot="content" />
</Dropdown>
