<script lang="ts">
  import bookmarks from '$lib/stores/bookmarks';
  import Content from '$lib/components/ui/content/Content.svelte';
  import NewsList from './NewsList.svelte';

  console.log(bookmarks);

  $: bookmarksBucket = { name: 'Lesezeichen', stories: $bookmarks.stories };
</script>

<Content id="bookmarks">
  <NewsList storyBuckets={[bookmarksBucket]} />
</Content>
