<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Item from '$lib/components/ui/content/Item.svelte';
  import Radio from '$lib/components/ui/controls/Radio.svelte';
  import type { ColorScheme } from '$lib/stores/styles';
  import styles from '$lib/stores/styles';

  function handleColorSchemeRadioChange(colorScheme: ColorScheme) {
    styles.setColorScheme(colorScheme);
  }
</script>

<Section title="Darstellung">
  <SectionList>
    <Item>
      <Radio
        id="color-scheme-system"
        name="color-scheme"
        label="Automatisch"
        checked={$styles.colorScheme === 'system'}
        on:change={handleColorSchemeRadioChange.bind(null, 'system')}
      />
    </Item>
    <Item>
      <Radio
        id="color-scheme-light"
        name="color-scheme"
        label="Hell"
        checked={$styles.colorScheme === 'light'}
        on:change={handleColorSchemeRadioChange.bind(null, 'light')}
      />
    </Item>
    <Item>
      <Radio
        id="color-scheme-dark"
        name="color-scheme"
        label="Dunkel"
        checked={$styles.colorScheme === 'dark'}
        on:change={handleColorSchemeRadioChange.bind(null, 'dark')}
      />
    </Item>
  </SectionList>
</Section>
