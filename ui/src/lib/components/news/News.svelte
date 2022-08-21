<script lang="ts">
  import news, { type NewsStore } from '$lib/stores/news';
  import { onDestroy, onMount } from 'svelte';
  import { searchNews } from '$lib/api/news';
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
  import searchRequestParameters from '$lib/stores/searchRequestParameters';
  import type { SearchRequestParameters } from '$lib/models/searchRequest';

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
    subscriptions.push(refreshNews.onUpdate(fetchNewNews));
    subscriptions.push(loadMoreNews.onUpdate(fetchMoreNews));
    subscriptions.push(searchRequestParameters.subscribe(fetchNews));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  async function fetchNews(searchRequestParameters: SearchRequestParameters) {
    await withLogging(async () => {
      news.setNews(await searchNews(fetch, searchRequestParameters));
    });
  }

  async function fetchNewNews() {
    await withLogging(async () => {
      const currSearchRequestParameters = get(searchRequestParameters);
      const prevKey = get(news).prevKey;
      if (!prevKey) {
        return;
      }
      const newNews = await searchNews(fetch, currSearchRequestParameters, prevKey);
      news.addNews(newNews, false);
    });
  }

  async function fetchMoreNews() {
    await withLogging(async () => {
      const currSearchRequestParameters = get(searchRequestParameters);
      const nextKey = get(news).nextKey;
      if (nextKey === null) {
        return;
      }
      const newNews = await searchNews(fetch, currSearchRequestParameters, nextKey);
      news.addNews(newNews);
    });
  }

  async function withLogging(handler: () => void | Promise<void>) {
    try {
      await handler();
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.warn(error);
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
  {:else if $news.isLoading}
    <NewsListSkeleton />
  {:else}
    <div class={newsFallbackWrapperClass}>
      <span>Keine News vorhanden. Versuchen Sie es später erneut.</span>
    </div>
  {/if}
  {#if showNewsList}
    <Button disabled={loadMoreButtonDisabled} on:click={handleLoadMoreClick}>Weitere laden</Button>
  {/if}
</Content>
