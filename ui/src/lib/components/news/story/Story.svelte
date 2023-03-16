<script lang="ts">
  import clsx from 'clsx';
  import Item from '$lib/components/ui/content/Item.svelte';
  import { defaultPadding } from '$lib/utils/styles';
  import StoryHeader from '$lib/components/news/story/header/StoryHeader.svelte';
  import StoryContent from '$lib/components/news/story/content/StoryContent.svelte';
  import Fade from '$lib/components/ui/transitions/Fade.svelte';
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import type { Story } from '$lib/models/story';
  import { selectStory } from '$lib/stores/newsEvents';
  import { unsubscribeAll, type Subscription } from '$lib/utils/subscriptions';

  export let story: Story;

  const subscriptions: Array<Subscription> = [];
  const dispatch = createEventDispatcher();

  let itemRef: Item;
  let headerRef: StoryHeader;
  let showContentInitial = false;
  let showContent = false;

  $: handleContentViewCollapse(showContent);

  $: headerClass = clsx([
    'flex flex-row items-center gap-3 top-12 sm:top-[54px]',
    defaultPadding,
    'text-gray-800 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-500',
    'border-gray-200 dark:border-gray-700',
    showContent && 'sticky z-10 border-solid border-b-2 bg-white dark:bg-gray-900',
    'cursor-pointer',
    'transition',
  ]);
  $: contentClass = clsx([defaultPadding, 'cursor-auto']);

  onMount(() => {
    subscriptions.push(selectStory.subscribe(handleStorySelect));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  function scrollIntoView(): void {
    tick().then(() => itemRef.scrollIntoView());
  }

  function toggleShowContent(): void {
    showContent = !showContent;
  }

  function handleStoryContentCollapse(): void {
    toggleShowContent();
  }

  function handleContentViewCollapse(showContent: boolean): void {
    if (showContentInitial && !showContent) {
      scrollIntoView();
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

  function handleHeaderKeydown(event: KeyboardEvent): void {
    const code = event.code;
    if (code === 'Enter' || code === 'Space') {
      event.preventDefault();
      toggleShowContent();
    }
    if (code === 'ArrowUp') {
      event.preventDefault();
      dispatch('selectStory', { id: story.id, next: false });
    }
    if (code === 'ArrowDown') {
      event.preventDefault();
      dispatch('selectStory', { id: story.id, next: true });
    }
  }

  function handleStorySelect(storyId: string): void {
    if (story.id === storyId) {
      headerRef.focus();
      scrollIntoView();
    }
  }
</script>

<Item bind:this={itemRef} noGap noPadding>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="header {headerClass}" on:click={handleHeaderWrapperClick}>
    <StoryHeader {story} on:click={handleHeaderClick} on:keydown={handleHeaderKeydown} bind:this={headerRef} />
  </div>
  {#if showContent}
    <Fade class="content {contentClass}">
      <StoryContent {story} on:collapse={handleStoryContentCollapse} />
    </Fade>
  {/if}
</Item>

<style lang="scss">
  .header {
    &.sticky {
      margin-bottom: -2px;
    }
  }

  .content {
    margin-top: 2px;
  }
</style>
