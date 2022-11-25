<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import StorySkeleton from './story/StorySkeleton.svelte';
</script>

<Section title="Aktuell" isLoading>
  <SectionList>
    <StorySkeleton />
    <StorySkeleton />
    <StorySkeleton />
    <StorySkeleton />
    <StorySkeleton />
  </SectionList>
</Section>
