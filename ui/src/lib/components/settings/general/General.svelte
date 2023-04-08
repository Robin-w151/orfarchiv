<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Item from '$lib/components/ui/content/Item.svelte';
  import Checkbox from '$lib/components/ui/controls/Checkbox.svelte';
  import settings from '$lib/stores/settings';
  import { requestSystemNotificationPermission } from '$lib/utils/notifications';

  function handleFetchReadMoreContentChange({ detail: checked }: { detail: boolean }) {
    settings.setFetchReadMoreContent(checked);
  }

  function handleCheckNewsUpdatesChange({ detail: checked }: { detail: boolean }) {
    settings.setCheckNewsUpdates(checked);
    if (checked) {
      requestSystemNotificationPermission();
    }
  }
</script>

<Section title="Allgemein">
  <SectionList>
    <Item>
      <Checkbox
        id="fetch-read-more-content"
        label="Inhalt von weiterführendem Artikel laden"
        checked={$settings.fetchReadMoreContent}
        on:change={handleFetchReadMoreContentChange}
      />
    </Item>
    <Item>
      <Checkbox
        id="check-news-updates"
        label="Erinnern wenn neue Nachrichten vorhanden sind"
        checked={$settings.checkNewsUpdates}
        on:change={handleCheckNewsUpdatesChange}
      />
    </Item>
  </SectionList>
</Section>
