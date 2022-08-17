<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import ChevronUpIcon from '$lib/components/ui/icons/outline/ChevronUpIcon.svelte';
  import classNames from 'classnames';
  import StoryContentSkeleton from './StoryContentSkeleton.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';

  export let id: string;
  export let url: string;

  const dispatch = createEventDispatcher();

  let isLoading = true;
  let content;

  const wrapperClass = classNames('flex flex-col items-center gap-3');
  const contentClass = classNames('cursor-auto');
  const errorLinkClass = classNames(['text-blue-800']);
  const collapseContentClass = classNames(['py-1.5 w-48 max-w-full']);

  onMount(async () => {
    try {
      content = await fetchContent(url);
    } catch (error) {
      console.warn(`Error: ${error.message}`);
    } finally {
      isLoading = false;
    }
  });

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
    <div class={contentClass} data-testid="story-content">
      {@html content}
    </div>
  {:else}
    <p data-testid="story-content-error">
      Inhalt kann nicht angezeigt werden. Klicken Sie <a class={errorLinkClass} href={url} target="_blank">hier</a> um zum
      Artikel zu gelangen.
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
