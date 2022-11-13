<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import type { NewsBucket } from '$lib/models/news';
  import Story from '$lib/components/news/story/Story.svelte';

  export let storyBuckets: Array<NewsBucket> | undefined = undefined;
  export let isLoading: boolean;

  const listClass = `cursor-pointer`;
</script>

{#if storyBuckets}
  {#each storyBuckets as bucket (bucket.name)}
    {#if bucket.stories.length > 0}
      <Section title={bucket.name} {isLoading}>
        <SectionList class={listClass}>
          {#each bucket.stories as story (story.id)}
            <li>
              <Story {story} />
            </li>
          {/each}
        </SectionList>
      </Section>
    {/if}
  {/each}
{/if}
