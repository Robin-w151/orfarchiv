<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import ChevronUpIcon from '$lib/components/ui/icons/outline/ChevronUpIcon.svelte';
  import classNames from 'classnames';
  import StoryContentSkeleton from './StoryContentSkeleton.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import { wait } from '$lib/utils/wait';
  import { fetchContent } from '$lib/api/news';
  import Link from '$lib/components/ui/controls/Link.svelte';
  import bookmarks from '$lib/stores/bookmarks';
  import type { Story } from '$lib/models/story';

  const MAX_RETRIES = 5;

  export let story: Story;

  const dispatch = createEventDispatcher();

  let isLoading = true;
  let content: string;
  let isClosed = false;

  const wrapperClass = classNames('flex flex-col items-center gap-3');
  const contentClass = classNames('cursor-auto w-full');
  const contentSourceClass = classNames('text-sm text-gray-500 dark:text-gray-400');
  const errorLinkClass = classNames(['text-blue-700']);
  const collapseContentClass = classNames(['py-1.5 w-48 max-w-full']);

  onMount(async () => {
    try {
      content = await fetchContentWithRetry(story.url);
    } catch (error) {
      const { message } = error as Error;
      console.warn(`Error: ${message}`);
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
    isClosed = true;
  });

  async function fetchContentWithRetry(url: string): Promise<string> {
    for (let retry = 0; retry < MAX_RETRIES && !isClosed; retry++) {
      try {
        const content = await fetchContent(url);
        if (story.isBookmarked) {
          bookmarks.setIsViewed(story);
        }
        return content;
      } catch (error) {
        if (retry < MAX_RETRIES - 1) {
          await wait(1000 * 2 ** retry);
        }
      }
    }

    throw new Error(`Failed to load story content after ${MAX_RETRIES} retries!`);
  }

  function handleCollapseFieldClick(): void {
    dispatch('collapse');
  }

  function handleCollapseFieldKeydown(event: Event): void {
    const code = (event as any).code;
    if (code === 'Enter' || code === 'Space') {
      event.preventDefault();
      dispatch('collapse');
    }
  }
</script>

<div class={wrapperClass}>
  {#if isLoading}
    <StoryContentSkeleton />
  {:else if content}
    <article class="story-content {contentClass}" data-testid="story-content">
      {@html content}
      <div class={contentSourceClass}>Quelle: <Link href={story.url}>orf.at</Link></div>
    </article>
  {:else}
    <p data-testid="story-content-error">
      Inhalt kann nicht angezeigt werden. Klicken Sie <Link class={errorLinkClass} href={story.url}>hier</Link> um zum Artikel
      zu gelangen.
    </p>
  {/if}
  <Button
    class={collapseContentClass}
    btnType="secondary"
    iconOnly
    on:click={handleCollapseFieldClick}
    on:keydown={handleCollapseFieldKeydown}
  >
    <ChevronUpIcon />
  </Button>
</div>
