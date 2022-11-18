<script lang="ts">
  import bookmarks from '$lib/stores/bookmarks';
  import Content from '$lib/components/ui/content/Content.svelte';
  import NewsList from './NewsList.svelte';
  import { defaultAlertTextBox } from '$lib/utils/styles';

  $: bookmarksAvailable = $bookmarks.stories?.length > 0;
  $: bookmarksBucket = { name: 'Lesezeichen', stories: $bookmarks.stories };
</script>

<Content id="bookmarks">
  {#if bookmarksAvailable}
    <NewsList storyBuckets={[bookmarksBucket]} />
  {:else}
    <div class={defaultAlertTextBox}>
      <p>Aktuell sind keine Lesezeichen vorhanden.</p>
      <p>Du kannst über die Optionen bei einem Artikel in der Übersicht ein Lesezeichen setzen.</p>
    </div>
  {/if}
</Content>
