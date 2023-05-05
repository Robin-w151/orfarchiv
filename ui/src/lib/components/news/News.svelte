<script lang="ts">
  import { checkNewsUpdates, searchNews } from '$lib/api/news';
  import NewsFilter from '$lib/components/news/filter/NewsFilter.svelte';
  import Content from '$lib/components/ui/content/Content.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import {
    NEWS_CHECK_UPDATES_INITIAL_INTERVAL_IN_MS,
    NEWS_CHECK_UPDATES_INTERVAL_IN_MS,
    NOTIFICATION_NEWS_UPDATES_AVAILABLE,
  } from '$lib/configs/client';
  import type { News } from '$lib/models/news';
  import type { SearchRequestParameters } from '$lib/models/searchRequest';
  import type { Settings } from '$lib/models/settings';
  import news from '$lib/stores/news';
  import { loadMoreNews, refreshNews, selectStory } from '$lib/stores/newsEvents';
  import notifications from '$lib/stores/notifications';
  import searchRequestParameters from '$lib/stores/searchRequestParameters';
  import settings from '$lib/stores/settings';
  import { defaultAlertTextBox } from '$lib/utils/styles';
  import { unsubscribeAll, type Subscription } from '$lib/utils/subscriptions';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import NewsList from './NewsList.svelte';
  import NewsListSkeleton from './NewsListSkeleton.svelte';

  const subscriptions: Array<Subscription> = [];

  let checkUpdatesTimeout: any;

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
    clearTimeout(checkUpdatesTimeout);
  });

  async function fetchNews(searchRequestParameters: SearchRequestParameters) {
    await news.taskWithLoading(async () => {
      const foundNews = await searchNews(searchRequestParameters);
      if (!foundNews?.prevKey) {
        news.setNews(foundNews);
        return;
      }

      const newNews = await searchNews(searchRequestParameters, foundNews?.prevKey);
      news.setNews(foundNews, newNews);
    });

    setCheckUpdatesTimeout(true);
  }

  async function fetchNewNews() {
    await news.taskWithLoading(async () => {
      const currSearchRequestParameters = get(searchRequestParameters);
      const prevKey = get(news).prevKey;
      if (!prevKey) {
        return;
      }
      const newNews = await searchNews(currSearchRequestParameters, prevKey);
      news.addNews(newNews, false);
    });

    setCheckUpdatesTimeout(true);
  }

  async function fetchMoreNews() {
    await news.taskWithLoading(async () => {
      const currSearchRequestParameters = get(searchRequestParameters);
      const nextKey = get(news).nextKey;
      if (nextKey === null) {
        return;
      }
      const newNews = await searchNews(currSearchRequestParameters, nextKey);
      news.addNews(newNews);
    });
  }

  async function fetchNewsUpdates() {
    const currSearchRequestParameters = get(searchRequestParameters);
    const prevKey = get(news).prevKey;
    if (!prevKey) {
      return;
    }

    try {
      const newsUpdates = await checkNewsUpdates(currSearchRequestParameters, prevKey);
      if (newsUpdates.updateAvailable) {
        notifications.notify('Neue Nachrichten verfügbar', 'Wollen Sie jetzt neu laden?', {
          uniqueCategory: NOTIFICATION_NEWS_UPDATES_AVAILABLE,
          requiredPathForFocus: '/',
          onAccept: () => {
            fetchNewNews();
          },
          onClose: () => {
            setCheckUpdatesTimeout(true);
          },
        });
      } else {
        setCheckUpdatesTimeout(false);
      }
    } catch (_) {
      console.log('Checking if new news updates are available failed.');
    }
  }

  function setCheckUpdatesTimeout(initial: boolean) {
    if (!$settings.checkNewsUpdates) {
      return;
    }

    clearTimeout(checkUpdatesTimeout);

    checkUpdatesTimeout = setTimeout(
      fetchNewsUpdates,
      initial ? NEWS_CHECK_UPDATES_INITIAL_INTERVAL_IN_MS : NEWS_CHECK_UPDATES_INTERVAL_IN_MS,
    );
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

  function handleStorySelect({ detail: { id, next } }: { detail: { id: string; next: boolean } }): void {
    const stories = get(news).stories;
    selectStory.select({ stories, id, next });
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
    <NewsList storyBuckets={$news.storyBuckets} isLoading={$news.isLoading} on:selectStory={handleStorySelect} />
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
