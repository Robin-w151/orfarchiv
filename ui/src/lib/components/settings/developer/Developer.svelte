<script lang="ts">
  import Item from '$lib/components/ui/content/Item.svelte';
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import { BOOKMARKS_STORE_NAME } from '$lib/stores/persistence/bookmarksDb';
  import { SETTINGS_STORE_NAME } from '$lib/stores/settings';

  function handleResetIndexedDbButtonClick() {
    indexedDB.deleteDatabase(BOOKMARKS_STORE_NAME);
    location.reload();
  }

  function handleResetLocalStorageButtonClick() {
    localStorage.removeItem(SETTINGS_STORE_NAME);
    location.reload();
  }
</script>

<Section title="Entwickler">
  <SectionList>
    <Item noColumn>
      <span>IndexedDB</span>
      <Button on:click={handleResetIndexedDbButtonClick}>Zurücksetzen</Button>
    </Item>
    <Item noColumn>
      <span>LocalStorage</span>
      <Button on:click={handleResetLocalStorageButtonClick}>Zurücksetzen</Button>
    </Item>
  </SectionList>
</Section>