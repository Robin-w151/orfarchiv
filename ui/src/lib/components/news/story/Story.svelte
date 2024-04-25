<script lang="ts">
  import clsx from 'clsx';
  import Item from '$lib/components/ui/content/Item.svelte';
  import { defaultPadding } from '$lib/utils/styles';
  import StoryHeader from '$lib/components/news/story/header/StoryHeader.svelte';
  import StoryContent from '$lib/components/news/story/content/StoryContent.svelte';
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import type { Story } from '$lib/models/story';
  import { selectStory } from '$lib/stores/newsEvents';
  import { unsubscribeAll, type Subscription } from '$lib/utils/subscriptions';
  import AccessibleTransition from '$lib/components/ui/transitions/AccessibleTransition.svelte';
  import { rollDown } from '$lib/utils/transitions';

  export let story: Story;

  const subscriptions: Array<Subscription> = [];
  const dispatch = createEventDispatcher();

  const headerClass = `
    flex flex-row items-center gap-3 top-[47px] sm:top-[53px]
    ${defaultPadding}
    text-gray-800 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-500
    border-gray-200 dark:border-gray-700
    cursor-pointer
    transition
  `;
  const contentClass = `${defaultPadding} mt-[2px] cursor-auto`;

  let itemRef: Item;
  let headerRef: StoryHeader;
  let showContentInitial = false;
  let showContent = false;

  $: handleContentViewCollapse(showContent);

  $: headerClassSticky = clsx([
    showContent && 'sticky z-10 mb-[-2px] border-solid border-b-2 bg-white dark:bg-gray-900',
  ]);

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
    const { code, ctrlKey } = event;
    if (code === 'Enter' || code === 'Space') {
      event.preventDefault();
      toggleShowContent();
    }
    if (code === 'ArrowUp' && ctrlKey) {
      event.preventDefault();
      dispatch('selectStory', { id: story.id, next: false });
    }
    if (code === 'ArrowDown' && ctrlKey) {
      event.preventDefault();
      dispatch('selectStory', { id: story.id, next: true });
    }
  }

  function handleStorySelect(storyId?: string): void {
    if (story.id === storyId) {
      headerRef.focus();
      scrollIntoView();
    }
  }
</script>

<Item bind:this={itemRef} noGap noPadding>
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="header {headerClass} {headerClassSticky}" on:click={handleHeaderWrapperClick}>
    <StoryHeader {story} on:click={handleHeaderClick} on:keydown={handleHeaderKeydown} bind:this={headerRef} />
  </div>
  {#if showContent}
    <AccessibleTransition class="content {contentClass}" transition={rollDown} onlyIn>
      <StoryContent {story} on:collapse={handleStoryContentCollapse} />
    </AccessibleTransition>
  {/if}
</Item>
