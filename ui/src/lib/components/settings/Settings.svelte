<script lang="ts">
  import Content from '../ui/content/Content.svelte';
  import Section from '../ui/content/Section.svelte';
  import SectionList from '../ui/content/SectionList.svelte';
  import Item from '../ui/content/Item.svelte';
  import Checkbox from '../ui/controls/Checkbox.svelte';
</script>

<Content>
  <Section title="Allgemein">
    <SectionList>
      <Item>
        <Checkbox id="asdf" label="Links in neuem Tab öffnen" />
      </Item>
    </SectionList>
  </Section>
</Content>
