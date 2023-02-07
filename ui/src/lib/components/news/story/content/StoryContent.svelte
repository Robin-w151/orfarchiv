<script lang="ts">
  import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte';
  import ChevronUpIcon from '$lib/components/ui/icons/outline/ChevronUpIcon.svelte';
  import StoryContentSkeleton from './StoryContentSkeleton.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import { wait } from '$lib/utils/wait';
  import { fetchContent } from '$lib/api/news';
  import Link from '$lib/components/ui/controls/Link.svelte';
  import bookmarks from '$lib/stores/bookmarks';
  import type { Story, StoryContent } from '$lib/models/story';
  import { get } from 'svelte/store';
  import settings from '$lib/stores/settings';
  import { getSourceLabel } from '$lib/models/settings';
  import { CTX_STORE, STORY_CONTENT_FETCH_MAX_RETRIES } from '$lib/configs/client';

  export let story: Story;

  const dispatch = createEventDispatcher();

  const wrapperClass = 'flex flex-col items-center gap-3';
  const contentClass = 'cursor-auto w-full';
  const contentInfoClass = 'text-sm text-gray-500 dark:text-gray-400';
  const errorLinkClass = 'text-blue-700';
  const collapseContentClass = 'py-1.5 w-48 max-w-full';

  let store = getContext(CTX_STORE);
  let isLoading = true;
  let isClosed = false;

  $: sourceLabel = getSourceLabel(story?.content?.source?.name);
  $: sourceUrl = story?.content?.source?.url ?? story?.url;

  onMount(async () => {
    try {
      if (story.content) {
        return;
      }

      const storyContent = await fetchContentWithRetry(story);
      if (storyContent) {
        store?.setContent?.(story.id, storyContent);

        if (story.isBookmarked && !story.isViewed) {
          bookmarks.setIsViewed(story);
        }
      }
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

  async function fetchContentWithRetry(story: Story): Promise<StoryContent> {
    for (let retry = 0; retry < STORY_CONTENT_FETCH_MAX_RETRIES && !isClosed; retry++) {
      try {
        const fetchReadMoreContent = get(settings).fetchReadMoreContent && story.source === 'news';
        return await fetchContent(story.url, fetchReadMoreContent);
      } catch (error) {
        if (retry < STORY_CONTENT_FETCH_MAX_RETRIES - 1) {
          await wait(1000 * 2 ** retry);
        }
      }
    }
    throw new Error(`Failed to load story content after ${STORY_CONTENT_FETCH_MAX_RETRIES} retries!`);
  }

  function handleCollapseFieldClick(): void {
    dispatch('collapse');
  }

  function handleCollapseFieldKeydown(event: KeyboardEvent): void {
    const code = event.code;
    if (code === 'Enter' || code === 'Space') {
      event.preventDefault();
      dispatch('collapse');
    }
  }
</script>

<div class={wrapperClass}>
  {#if isLoading}
    <StoryContentSkeleton />
  {:else if story.content}
    <article class="story-content {contentClass}" data-testid="story-content">
      {#if sourceLabel}
        <div class={contentInfoClass}>Inhalt geladen von {sourceLabel}</div>
      {/if}
      {@html story.content.content}
      <div class={contentInfoClass}>Quelle: <Link href={sourceUrl}>orf.at</Link></div>
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
    title="Artikel schließen"
    on:click={handleCollapseFieldClick}
    on:keydown={handleCollapseFieldKeydown}
  >
    <ChevronUpIcon />
  </Button>
</div>
