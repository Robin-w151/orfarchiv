<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Item from '$lib/components/ui/content/Item.svelte';
  import Radio from '$lib/components/ui/controls/Radio.svelte';
  import styles, { type ColorScheme } from '$lib/stores/styles';

  let colorScheme: ColorScheme = $styles.colorScheme;

  function handleColorSchemeRadioChange() {
    if (colorScheme) {
      styles.setColorScheme(colorScheme);
    }
  }
</script>

<Section title="Darstellung">
  <SectionList>
    <Item>
      <Radio
        id="color-scheme-system"
        name="color-scheme"
        label="Automatisch"
        value="system"
        bind:group={colorScheme}
        on:change={handleColorSchemeRadioChange}
      />
    </Item>
    <Item>
      <Radio
        id="color-scheme-light"
        name="color-scheme"
        label="Hell"
        value="light"
        bind:group={colorScheme}
        on:change={handleColorSchemeRadioChange}
      />
    </Item>
    <Item>
      <Radio
        id="color-scheme-dark"
        name="color-scheme"
        label="Dunkel"
        value="dark"
        bind:group={colorScheme}
        on:change={handleColorSchemeRadioChange}
      />
    </Item>
  </SectionList>
</Section>
