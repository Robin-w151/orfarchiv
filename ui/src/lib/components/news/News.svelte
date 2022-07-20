<script lang="ts">
  import news from '../../stores/news';
  import { onDestroy, onMount } from 'svelte';
  import LoadingIndicator from '../ui/LoadingIndicator.svelte';
  import { getNews } from '../../api/news';
  import Content from '../ui/content/Content.svelte';
  import classNames from 'classnames';
  import NewsList from './NewsList.svelte';
  import { refreshNews } from '../../stores/newsEvents';

  let isNewsLoading = true;
  let refreshNewsUnsubscribe = null;

  const newsLoadingWrapperClass = classNames(['mt-12 w-24 aspect-square', 'text-blue-900']);
  const newsFallbackWrapperClass = classNames([
    'px-6 py-3',
    'w-full',
    'text-lg',
    'text-gray-800 bg-white',
    'rounded-lg',
  ]);

  onMount(() => {
    fetchNews();
    refreshNewsUnsubscribe = refreshNews.onUpdate(() => {
      fetchNews();
    });
  });

  onDestroy(() => {
    clearNews();
    refreshNewsUnsubscribe?.();
  });

  async function fetchNews() {
    isNewsLoading = true;
    try {
      news.setNews(await getNews());
    } catch (error) {
      console.warn(error);
      news.setNews(null);
    } finally {
      isNewsLoading = false;
    }
  }

  function clearNews() {
    news.setNews(null);
  }
</script>

<Content>
  {#if isNewsLoading}
    <div class={newsLoadingWrapperClass}>
      <LoadingIndicator />
    </div>
  {:else if $news}
    <NewsList />
  {:else}
    <div class={newsFallbackWrapperClass}>
      <span>Keine News vorhanden. Versuchen Sie es später erneut.</span>
    </div>
  {/if}
</Content>
