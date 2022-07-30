<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import ChevronUp from '../ui/icons/outline/ChevronUp.svelte';
  import classNames from 'classnames';

  export let id: string;
  export let url: string;

  const dispatch = createEventDispatcher();

  let isLoading = true;
  let content;

  const contentClass = classNames('cursor-auto');
  const loadingIndicatorClass = classNames(['flex flex-col items-start gap-2', 'w-full']);
  const loadingIndicatorBarClass = classNames(['h-4', 'bg-gray-300', 'rounded-sm animate-pulse']);
  const errorLinkClass = classNames(['text-blue-800']);
  const collapseContentClass = classNames([
    'flex justify-center',
    'hover:text-blue-800 focus:text-blue-800',
    'outline-none',
  ]);

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

{#if isLoading}
  <div class={loadingIndicatorClass}>
    <span class={loadingIndicatorBarClass} style:width="40%" style:margin-bottom="0.5rem" />
    <span class={loadingIndicatorBarClass} style:width="95%" />
    <span class={loadingIndicatorBarClass} style:width="85%" />
    <span class={loadingIndicatorBarClass} style:width="90%" />
  </div>
{:else if content}
  <div class={contentClass}>
    {@html content}
  </div>
{:else}
  <p>
    Inhalt kann nicht angezeigt werden. Klicken Sie <a class={errorLinkClass} href={url} target="_blank">hier</a> um zur
    Story zu gelangen.
  </p>
{/if}
<div
  class={collapseContentClass}
  on:click={handleCollapseFieldClick}
  on:keydown={handleCollapseFieldKeydown}
  tabindex="0"
>
  <ChevronUp />
</div>
