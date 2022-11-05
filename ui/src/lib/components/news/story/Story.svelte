<script lang="ts">
  import classNames from 'classnames';
  import Item from '$lib/components/ui/content/Item.svelte';
  import { defaultPadding } from '$lib/utils/styles';
  import StoryHeader from '$lib/components/news/story/header/StoryHeader.svelte';
  import StoryContent from '$lib/components/news/story/content/StoryContent.svelte';
  import Fade from '$lib/components/ui/transitions/Fade.svelte';
  import { tick } from 'svelte';

  export let title: string;
  export let category: string;
  export let url: string;
  export let timestamp: string;
  export let source: string;

  let itemRef: Item;
  let showContentInitial = false;
  let showContent = false;

  $: handleContentViewCollapse(showContent);

  $: headerClass = classNames([
    'flex flex-row items-center gap-3',
    defaultPadding,
    'text-gray-800 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-500',
    'border-gray-200 dark:border-gray-700',
    showContent && 'sticky z-10 border-solid border-b-2 bg-white dark:bg-gray-900',
    'cursor-pointer',
    'transition',
  ]);
  $: contentClass = classNames([defaultPadding, 'cursor-auto']);

  function toggleShowContent(): void {
    showContent = !showContent;
  }

  function handleStoryContentCollapse(): void {
    toggleShowContent();
  }

  function handleContentViewCollapse(showContent: boolean): void {
    if (showContentInitial && !showContent) {
      tick().then(() => itemRef.scrollIntoView());
    }

    if (!showContentInitial) {
      showContentInitial = true;
    }
  }

  function handleHeaderWrapperClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      toggleShowContent();
    }
  }

  function handleHeaderClick(): void {
    toggleShowContent();
  }

  function handleHeaderKeydown(event: Event): void {
    const code = (event as any).code;
    if (code === 'Enter' || code === 'Space') {
      event.preventDefault();
      toggleShowContent();
    }
  }
</script>

<Item bind:this={itemRef} noGap noPadding>
  <div class="header {headerClass}" on:click={handleHeaderWrapperClick}>
    <StoryHeader
      {title}
      {category}
      {url}
      {timestamp}
      {source}
      on:click={handleHeaderClick}
      on:keydown={handleHeaderKeydown}
    />
  </div>
  {#if showContent}
    <Fade class="content {contentClass}">
      <StoryContent {url} on:collapse={handleStoryContentCollapse} />
    </Fade>
  {/if}
</Item>

<style lang="scss">
  .header {
    top: 46px;

    @screen sm {
      top: 54px;
    }

    &.sticky {
      margin-bottom: -2px;
    }
  }

  .content {
    margin-top: 2px;
  }
</style>
