<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import ChevronUpIcon from '../../../ui/icons/outline/ChevronUpIcon.svelte';
  import classNames from 'classnames';
  import StoryContentSkeleton from './StoryContentSkeleton.svelte';
  import Button from '../../../ui/controls/Button.svelte';
  import { wait } from '../../../../utils/wait';
  import { fetchContent } from '../../../../api/news';

  const MAX_RETRIES = 5;

  export let url: string;

  const dispatch = createEventDispatcher();

  let isLoading = true;
  let content;
  let isClosed = false;

  const wrapperClass = classNames('flex flex-col items-center gap-3');
  const contentClass = classNames('cursor-auto w-full');
  const contentSourceClass = classNames('text-sm text-gray-600');
  const errorLinkClass = classNames(['text-blue-700']);
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

  onDestroy(() => {
    isClosed = true;
  });

  async function fetchContentWithRetry(url: string): Promise<string> {
    for (let retry = 0; retry < MAX_RETRIES && !isClosed; retry++) {
      try {
        return await fetchContent(url);
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
      <div class={contentSourceClass}>Quelle: <a href={url} target="_blank" rel="noopener">orf.at</a></div>
    </article>
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
    btnType="secondary"
    iconOnly
    on:click={handleCollapseFieldClick}
    on:keydown={handleCollapseFieldKeydown}
  >
    <ChevronUpIcon />
  </Button>
</div>
