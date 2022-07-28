<script lang="ts" context="module">
  import News from '$lib/components/news/News.svelte';
  import news from '$lib/stores/news';
  import { getNews } from '$lib/api/news';
  import { get } from 'svelte/store';

  type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

  export async function load({ fetch }: { fetch: FetchFn }) {
    const stories = get(news)?.stories?.length ?? 0;
    if (stories === 0) {
      news.setNews(await getNews(fetch));
    }
    return {
      props: {},
    };
  }
</script>

<svelte:head>
  <title>ORF News Archiv</title>
</svelte:head>

<News />
