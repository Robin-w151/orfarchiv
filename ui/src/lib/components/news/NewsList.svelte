<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import Story from './story/Story.svelte';
  import type { NewsBucket } from '$lib/models/news';

  export let storyBuckets: Array<NewsBucket> | undefined = undefined;
</script>

{#if storyBuckets}
  {#each storyBuckets as bucket (bucket.name)}
    {#if bucket.stories.length > 0}
      <Section title={bucket.name}>
        <SectionList>
          {#each bucket.stories as story (story.id)}
            <li>
              <Story {...story} />
            </li>
          {/each}
        </SectionList>
      </Section>
    {/if}
  {/each}
{/if}
