<script lang="ts">
  import news from '../../stores/news';
  import { onDestroy, onMount } from 'svelte';
  import LoadingIndicator from '../ui/LoadingIndicator.svelte';
  import { getNews } from '../../api/news';
  import Content from '../ui/content/Content.svelte';
  import classNames from 'classnames';
  import NewsList from './NewsList.svelte';
  import { refreshNews } from '../../stores/newsEvents';
  import { unsubscribeAll } from '../../utils/subscriptions';
  import settings from '../../stores/settings';
  import type { Unsubscriber } from 'svelte/store';
  import NewsFilter from './NewsFilter.svelte';

  let isNewsLoading = false;
  let subscriptions: Array<Unsubscriber> = [];

  $: showNewsList =
    $news.storyBuckets && $news.storyBuckets?.reduce((count, bucket) => count + bucket.stories.length, 0) > 0;
  $: anySourcesEnabled = !$settings.sources || $settings.sources?.length > 0;

  const newsLoadingWrapperClass = classNames(['mt-12 w-24 aspect-square', 'text-blue-900']);
  const newsFallbackWrapperClass = classNames([
    'px-6 py-3',
    'w-full',
    'text-lg',
    'text-gray-800 bg-white',
    'rounded-lg',
  ]);

  onMount(() => {
    subscriptions.push(refreshNews.onUpdate(fetchNews));
  });

  onDestroy(() => {
    unsubscribeAll(subscriptions);
  });

  async function fetchNews() {
    isNewsLoading = true;
    try {
      news.setNews(await getNews(fetch));
    } catch (error) {
      console.warn(error);
      news.setNews({ stories: [] });
    } finally {
      isNewsLoading = false;
    }
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
</Content>
