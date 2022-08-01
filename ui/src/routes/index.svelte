<script lang="ts" context="module">
  import News from '$lib/components/news/News.svelte';

  export const prerender = true;
</script>

<svelte:head>
  <title>ORF News Archiv</title>
</svelte:head>

<News />
