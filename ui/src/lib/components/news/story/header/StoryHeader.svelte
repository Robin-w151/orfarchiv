<script lang="ts">
  import classNames from 'classnames';
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

  const infoClass = classNames(['flex flex-col flex-1 items-start', 'focus:text-blue-800', 'outline-none']);
  const metadataClass = classNames(['text-sm', 'text-gray-600']);

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
  <span class={metadataClass}
    >{category}{#if sourceLabel}<span>&nbsp;({sourceLabel})</span>{/if} - {formatTimestamp(timestamp)}</span
  >
</header>
<Popover btnType="secondary" iconOnly placement="bottom-end" let:onClose>
  <EllipsisVerticalIcon slot="button-content" />
  <StoryMenu {url} {onClose} slot="content" />
</Popover>
