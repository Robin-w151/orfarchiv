<script lang="ts">
  import news, { type NewsStore } from '$lib/stores/news';
  import { onDestroy, onMount } from 'svelte';
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
  import NewsListSkeleton from './NewsListSkeleton.svelte';
  import { defaultPadding } from '$lib/utils/styles';

  let isNewsLoading = true;
  let firstLoadStarted = false;
  let subscriptions: Array<Unsubscriber> = [];

  $: showNewsList = hasNews($news);
  $: anySourcesEnabled = hasAnySourcesEnabled($settings);
  $: loadMoreButtonDisabled = $news.nextKey === null;

  const newsFallbackWrapperClass = classNames([
    defaultPadding,
    'w-full',
    'text-lg',
    'text-gray-800 bg-white',
    'rounded-lg',
  ]);

  onMount(async () => {
    await fetchNews();
    await fetchNewNews();
    subscriptions.push(refreshNews.onUpdate(fetchNewNews));
    subscriptions.push(loadMoreNews.onUpdate(fetchMoreNews));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  async function fetchNews() {
    await withLoadingIndication(async () => {
      news.setNews(await getNews(fetch));
    });
  }

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
    if (firstLoadStarted && isNewsLoading) {
      return;
    }
    if (!firstLoadStarted) {
      firstLoadStarted = true;
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
    <NewsListSkeleton />
  {:else}
    <div class={newsFallbackWrapperClass}>
      <span>Keine News vorhanden. Versuchen Sie es später erneut.</span>
    </div>
  {/if}
  {#if showNewsList || !isNewsLoading}
    <Button disabled={loadMoreButtonDisabled} on:click={handleLoadMoreClick}>Weitere laden</Button>
  {/if}
</Content>
