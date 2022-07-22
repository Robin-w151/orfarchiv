<script lang="ts">
  import Section from '../ui/content/Section.svelte';
  import SectionList from '../ui/content/SectionList.svelte';
  import Story from './Story.svelte';
  import type { NewsBucket } from '../../models/news';

  export let storyBuckets: Array<NewsBucket>;
</script>

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
