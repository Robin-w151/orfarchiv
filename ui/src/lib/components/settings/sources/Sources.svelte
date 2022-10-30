<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Item from '$lib/components/ui/content/Item.svelte';
  import Checkbox from '$lib/components/ui/controls/Checkbox.svelte';
  import settings from '$lib/stores/settings';
  import { sources } from '$lib/models/settings.js';

  function handleSourceChange(source: string, { detail: checked }: { detail: boolean }) {
    settings.setSource(source, checked);
  }
</script>

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
