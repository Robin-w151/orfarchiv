<script lang="ts">
  import { searchNews } from '$lib/api/news';
  import NewsFilter from '$lib/components/news/filter/NewsFilter.svelte';
  import Content from '$lib/components/ui/content/Content.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import type { News } from '$lib/models/news';
  import type { SearchRequestParameters } from '$lib/models/searchRequest';
  import type { Settings } from '$lib/models/settings';
  import news from '$lib/stores/news';
  import { loadMoreNews, refreshNews } from '$lib/stores/newsEvents';
  import searchRequestParameters from '$lib/stores/searchRequestParameters';
  import settings from '$lib/stores/settings';
  import { defaultAlertTextBox } from '$lib/utils/styles';
  import { unsubscribeAll } from '$lib/utils/subscriptions';
  import { onDestroy, onMount } from 'svelte';
  import type { Unsubscriber } from 'svelte/store';
  import { get } from 'svelte/store';
  import NewsList from './NewsList.svelte';
  import NewsListSkeleton from './NewsListSkeleton.svelte';

  let subscriptions: Array<Unsubscriber> = [];

  $: showNewsList = hasNews($news as News);
  $: anySourcesEnabled = hasAnySourcesEnabled($settings as Settings);
  $: loadMoreButtonDisabled = $news.nextKey === null;

  onMount(async () => {
    subscriptions.push(refreshNews.onUpdate(fetchNewNews));
    subscriptions.push(loadMoreNews.onUpdate(fetchMoreNews));
    subscriptions.push(searchRequestParameters.subscribe(fetchNews));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  async function fetchNews(searchRequestParameters: SearchRequestParameters) {
    await searchWithLoadingStatus(async () => {
      const foundNews = await searchNews(searchRequestParameters);
      if (!foundNews?.prevKey) {
        news.setNews(foundNews);
        return;
      }

      const newNews = await searchNews(searchRequestParameters, foundNews?.prevKey);
      news.setNews(foundNews, newNews);
    });
  }

  async function fetchNewNews() {
    await searchWithLoadingStatus(async () => {
      const currSearchRequestParameters = get(searchRequestParameters);
      const prevKey = get(news).prevKey;
      if (!prevKey) {
        return;
      }
      const newNews = await searchNews(currSearchRequestParameters, prevKey);
      news.addNews(newNews, false);
    });
  }

  async function fetchMoreNews() {
    await searchWithLoadingStatus(async () => {
      const currSearchRequestParameters = get(searchRequestParameters);
      const nextKey = get(news).nextKey;
      if (nextKey === null) {
        return;
      }
      const newNews = await searchNews(currSearchRequestParameters, nextKey);
      news.addNews(newNews);
    });
  }

  async function searchWithLoadingStatus(handler: () => void | Promise<void>) {
    try {
      news.setIsLoading(true);
      await handler();
      news.setIsLoading(false);
    } catch (error) {
      const { name } = error as Error;
      if (name === 'AbortError') {
        return;
      }
      news.setIsLoading(false);
      console.warn(error);
    }
  }

  function hasNews(news?: News): boolean {
    return !!news?.storyBuckets && news.storyBuckets.reduce((count, bucket) => count + bucket.stories.length, 0) > 0;
  }

  function hasAnySourcesEnabled(settings?: Settings): boolean {
    return !settings || !settings.sources || settings.sources.length > 0;
  }

  function handleLoadMoreClick(): void {
    loadMoreNews.notify();
  }
</script>

<Content id="news">
  <NewsFilter />
  {#if !anySourcesEnabled}
    <div class={defaultAlertTextBox}>
      <span
        >Aktuell sind alle Quellen deaktiviert. Gehen Sie zu den Einstellungen und aktivieren Sie mindestens eine Quelle
        um Nachrichten zu sehen.</span
      >
    </div>
  {:else if showNewsList}
    <NewsList storyBuckets={$news.storyBuckets} isLoading={$news.isLoading} store={news} />
  {:else if $news.isLoading}
    <NewsListSkeleton />
  {:else}
    <div class={defaultAlertTextBox}>
      <span>Keine News vorhanden. Versuchen Sie es später erneut.</span>
    </div>
  {/if}
  {#if showNewsList}
    <Button disabled={loadMoreButtonDisabled} on:click={handleLoadMoreClick}>Weitere laden</Button>
  {/if}
</Content>
