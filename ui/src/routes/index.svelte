<script lang="ts" context="module">
  import News from '../lib/components/news/News.svelte';
  import news from '../lib/stores/news';
  import { getNews } from '../lib/api/news';

  export async function load({ fetch }) {
    news.setNews(await getNews(fetch));
    return {
      props: {},
    };
  }
</script>

<svelte:head>
  <title>ORF News Archiv</title>
</svelte:head>

<News />
