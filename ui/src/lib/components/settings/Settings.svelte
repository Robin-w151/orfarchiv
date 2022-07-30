<script lang="ts">
  import Content from '$lib/components/ui/content/Content.svelte';
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Item from '$lib/components/ui/content/Item.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import Checkbox from '$lib/components/ui/controls/Checkbox.svelte';
  import settings from '$lib/stores/settings';
  import { goto } from '$app/navigation';
  import Actions from '$lib/components/ui/content/Actions.svelte';
  import { sources } from '$lib/models/settings.js';

  function handleOpenLinksInNewTabChange({ detail: checked }: { detail: boolean }) {
    settings.setOpenLinksInNewTab(checked);
  }

  function handleUseCategoryColorPaletteChange({ detail: checked }: { detail: boolean }) {
    settings.setUseCategoryColorPalette(checked);
  }

  function handleSourceChange(source: string, { detail: checked }: { detail: boolean }) {
    settings.setSource(source, checked);
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
          on:change={handleOpenLinksInNewTabChange}
        />
      </Item>
      <Item>
        <Checkbox
          id="use-category-color-palette"
          label="Kategoriefarben für Stories verwenden"
          checked={$settings.useCategoryColorPalette}
          on:change={handleUseCategoryColorPaletteChange}
        />
      </Item>
    </SectionList>
  </Section>
  <Section title="Quellen">
    <SectionList>
      {#each sources as { label, key } (key)}
        <Item>
          <Checkbox
            id={`source-${key}`}
            {label}
            checked={$settings.sources?.includes(key)}
            on:change={handleSourceChange.bind(null, key)}
          />
        </Item>
      {/each}
    </SectionList>
  </Section>
</Content>

<Actions>
  <Button on:click={handleSaveButtonClick}>Fertig</Button>
</Actions>
