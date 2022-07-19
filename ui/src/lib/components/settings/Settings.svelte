<script lang="ts">
  import Content from '../ui/content/Content.svelte';
  import Section from '../ui/content/Section.svelte';
  import SectionList from '../ui/content/SectionList.svelte';
  import Item from '../ui/content/Item.svelte';
  import Button from '../ui/controls/Button.svelte';
  import Checkbox from '../ui/controls/Checkbox.svelte';
  import settings from '../../stores/settings';
  import { goto } from '$app/navigation';

  function handleOpenLinksInNewTabSelect({ detail: checked }) {
    settings.setOpenLinksInNewTab(checked);
  }

  function handleUseCategoryColorPalette({ detail: checked }) {
    settings.setUseCategoryColorPalette(checked);
  }

  function handleSaveButtonClick() {
    goto('/');
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
      <Item>
        <Checkbox
          id="use-category-color-palette"
          label="Kategoriefarben für Stories verwenden"
          checked={$settings.useCategoryColorPalette}
          on:change={handleUseCategoryColorPalette}
        />
      </Item>
    </SectionList>
  </Section>
  <Button on:click={handleSaveButtonClick}>Speichern</Button>
</Content>
