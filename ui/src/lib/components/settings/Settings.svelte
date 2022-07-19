<script lang="ts">
  import Content from '../ui/content/Content.svelte';
  import Section from '../ui/content/Section.svelte';
  import SectionList from '../ui/content/SectionList.svelte';
  import Item from '../ui/content/Item.svelte';
  import Checkbox from '../ui/controls/Checkbox.svelte';
  import settings from '../../stores/settings';

  function handleOpenLinksInNewTabSelect({ detail: checked }) {
    settings.setOpenLinksInNewTab(checked);
  }
</script>

<Content>
  <Section title="Allgemein">
    <SectionList>
      <Item>
        <Checkbox
          id="open-links-in-new-tab"
          label="Links in neuem Tab öffnen"
          checked={$settings.openLinksInNewTab}
          on:change={handleOpenLinksInNewTabSelect}
        />
      </Item>
    </SectionList>
  </Section>
</Content>
