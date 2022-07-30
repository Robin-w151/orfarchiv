<script lang="ts">
  import news, { type NewsStore } from '$lib/stores/news';
  import { onDestroy, onMount } from 'svelte';
  import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
  import { getNews } from '$lib/api/news';
  import Content from '$lib/components/ui/content/Content.svelte';
  import classNames from 'classnames';
  import NewsList from './NewsList.svelte';
  import { loadMoreNews, refreshNews } from '$lib/stores/newsEvents';
  import { unsubscribeAll } from '$lib/utils/subscriptions';
  import settings, { type SettingsStore } from '$lib/stores/settings';
  import type { Unsubscriber } from 'svelte/store';
  import NewsFilter from './NewsFilter.svelte';
  import { get } from 'svelte/store';
  import Button from '$lib/components/ui/controls/Button.svelte';

  let isNewsLoading = false;
  let subscriptions: Array<Unsubscriber> = [];

  $: showNewsList = hasNews($news);
  $: anySourcesEnabled = hasAnySourcesEnabled($settings);
  $: loadMoreButtonDisabled = $news.nextKey === null;

  const newsLoadingWrapperClass = classNames(['mt-12 w-24 aspect-square', 'text-blue-900']);
  const newsFallbackWrapperClass = classNames([
    'px-3 sm:px-6 py-3',
    'w-full',
    'text-lg',
    'text-gray-800 bg-white',
    'rounded-lg',
  ]);

  onMount(() => {
    subscriptions.push(refreshNews.onUpdate(fetchNewNews));
    subscriptions.push(loadMoreNews.onUpdate(fetchMoreNews));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  async function fetchNewNews() {
    await withLoadingIndication(async () => {
      const prevKey = get(news).prevKey;
      if (!prevKey) {
        return;
      }
      const newNews = await getNews(fetch, prevKey);
      news.addNews(newNews, false);
    });
  }

  async function fetchMoreNews() {
    await withLoadingIndication(async () => {
      const nextKey = get(news).nextKey;
      if (nextKey === null) {
        return;
      }
      const newNews = await getNews(fetch, nextKey);
      news.addNews(newNews);
    });
  }

  async function withLoadingIndication(handler: () => void | Promise<void>) {
    if (isNewsLoading) {
      return;
    }
    isNewsLoading = true;

    try {
      await handler();
    } catch (error) {
      console.warn(error);
    } finally {
      isNewsLoading = false;
    }
  }

  function hasNews(newsStore?: NewsStore): boolean {
    return (
      !!newsStore?.storyBuckets &&
      newsStore.storyBuckets.reduce((count, bucket) => count + bucket.stories.length, 0) > 0
    );
  }

  function hasAnySourcesEnabled(settingsStore?: SettingsStore): boolean {
    return !settingsStore || !settingsStore.sources || settingsStore.sources.length > 0;
  }

  function handleLoadMoreClick(): void {
    loadMoreNews.notify();
  }
</script>

<Content>
  <NewsFilter />
  {#if !anySourcesEnabled}
    <div class={newsFallbackWrapperClass}>
      <span
        >Aktuell sind alle Quellen deaktiviert. Gehen Sie zu den Einstellungen und aktivieren Sie mindestens eine Quelle
        um Nachrichten zu sehen.</span
      >
    </div>
  {:else if showNewsList}
    <NewsList storyBuckets={$news.storyBuckets} />
  {:else if isNewsLoading}
    <div class={newsLoadingWrapperClass}>
      <LoadingIndicator />
    </div>
  {:else}
    <div class={newsFallbackWrapperClass}>
      <span>Keine News vorhanden. Versuchen Sie es später erneut.</span>
    </div>
  {/if}
  <Button disabled={loadMoreButtonDisabled} on:click={handleLoadMoreClick}>Weitere laden</Button>
</Content>
