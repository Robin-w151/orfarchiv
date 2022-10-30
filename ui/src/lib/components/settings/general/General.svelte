<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Item from '$lib/components/ui/content/Item.svelte';
  import Checkbox from '$lib/components/ui/controls/Checkbox.svelte';
  import settings from '$lib/stores/settings';

  function handleOpenLinksInNewTabChange({ detail: checked }: { detail: boolean }) {
    settings.setOpenLinksInNewTab(checked);
  }
</script>

<Section title="Allgemein">
  <SectionList>
    <Item>
      <Checkbox
        id="open-links-in-new-tab"
        label="Links in neuem Tab öffnen"
        checked={$settings.openLinksInNewTab}
        on:change={handleOpenLinksInNewTabChange}
      />
    </Item>
  </SectionList>
</Section>
