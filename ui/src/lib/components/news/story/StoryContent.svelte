<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import ChevronUpIcon from '$lib/components/ui/icons/outline/ChevronUpIcon.svelte';
  import classNames from 'classnames';
  import StoryContentSkeleton from './StoryContentSkeleton.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import { wait } from '$lib/utils/wait';

  const MAX_RETRIES = 5;

  export let id: string;
  export let url: string;

  const dispatch = createEventDispatcher();

  let isLoading = true;
  let content;
  let retry = 0;

  const wrapperClass = classNames('flex flex-col items-center gap-3');
  const contentClass = classNames('cursor-auto');
  const contentSourceClass = classNames('text-sm text-gray-600');
  const errorLinkClass = classNames(['text-blue-800']);
  const collapseContentClass = classNames(['py-1.5 w-48 max-w-full']);

  onMount(async () => {
    try {
      content = await fetchContentWithRetry(url);
    } catch (error) {
      console.warn(`Error: ${error.message}`);
    } finally {
      isLoading = false;
    }
  });

  async function fetchContentWithRetry(url: string): Promise<string> {
    if (retry < MAX_RETRIES) {
      retry++;
      try {
        return await fetchContent(url);
      } catch (error) {
        await wait(500 * 2 ** retry);
        return fetchContentWithRetry(url);
      }
    } else {
      throw new Error(`Failed to load story content after ${MAX_RETRIES} retries!`);
    }
  }

  async function fetchContent(url: string): Promise<string> {
    const response = await fetch(`/news/${id}?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error('Failed to load story content!');
    }
    return await response.text();
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
    <div class="story-content {contentClass}" data-testid="story-content">
      {@html content}
      <div class={contentSourceClass}>Quelle: <a href="https://orf.at" target="_blank" rel="noopener">orf.at</a></div>
    </div>
  {:else}
    <p data-testid="story-content-error">
      Inhalt kann nicht angezeigt werden. Klicken Sie <a
        class={errorLinkClass}
        href={url}
        target="_blank"
        rel="noopener">hier</a
      > um zum Artikel zu gelangen.
    </p>
  {/if}
  <Button
    class={collapseContentClass}
    btnType="link"
    iconOnly
    on:click={handleCollapseFieldClick}
    on:keydown={handleCollapseFieldKeydown}
  >
    <ChevronUpIcon />
  </Button>
</div>
