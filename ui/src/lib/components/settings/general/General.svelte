<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Item from '$lib/components/ui/content/Item.svelte';
  import Checkbox from '$lib/components/ui/controls/Checkbox.svelte';
  import settings from '$lib/stores/settings';

  function handleFetchReadMoreContentChange({ detail: checked }: { detail: boolean }) {
    settings.setFetchReadMoreContent(checked);
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
  </SectionList>
</Section>
