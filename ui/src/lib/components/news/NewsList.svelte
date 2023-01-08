<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import type { NewsBucket } from '$lib/models/news';
  import Story from '$lib/components/news/story/Story.svelte';
  import { setContext } from 'svelte';
  import { CTX_STORE } from '$lib/configs/client';

  export let storyBuckets: Array<NewsBucket> | undefined = undefined;
  export let isLoading = false;
  export let store = undefined;
  $: setContext(CTX_STORE, store);

  const listClass = `cursor-pointer`;
</script>

{#if storyBuckets}
  {#each storyBuckets as bucket (bucket.name)}
    {#if bucket.stories.length > 0}
      <Section title={bucket.name} {isLoading}>
        <SectionList class={listClass}>
          {#each bucket.stories as story (story.id)}
            <Story {story} />
          {/each}
        </SectionList>
      </Section>
    {/if}
  {/each}
{/if}
