<script lang="ts">
  import bookmarks from '$lib/stores/bookmarks';
  import Content from '$lib/components/ui/content/Content.svelte';
  import NewsList from '../NewsList.svelte';
  import { defaultAlertTextBox } from '$lib/utils/styles';
  import BookmarkActions from '../filter/BookmarkActions.svelte';
  import NewsListSkeleton from '$lib/components/news/NewsListSkeleton.svelte';

  $: bookmarksAvailable = $bookmarks.filteredStories?.length > 0;
  $: bookmarksBucket = { name: 'Lesezeichen', stories: $bookmarks.filteredStories };
</script>

<Content id="bookmarks">
  <BookmarkActions />
  {#if bookmarksAvailable}
    <NewsList storyBuckets={[bookmarksBucket]} isLoading={$bookmarks.isLoading} />
  {:else if $bookmarks.isLoading}
    <NewsListSkeleton />
  {:else}
    <div class={defaultAlertTextBox}>
      <p>Aktuell sind keine Lesezeichen vorhanden.</p>
      <p>
        Du kannst über die Optionen bei einem Artikel in der Übersicht ein Lesezeichen setzen oder oben den Suchtext
        anpassen.
      </p>
    </div>
  {/if}
</Content>
