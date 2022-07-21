<script lang="ts">
  import news from '../../stores/news';
  import type { Story as IStory } from '../../models/story';
  import { DateTime } from 'luxon';
  import type { NewsBucket } from '../../models/news';
  import Section from '../ui/content/Section.svelte';
  import SectionList from '../ui/content/SectionList.svelte';
  import Story from './Story.svelte';

  $: storyBuckets = createStoryBuckets($news?.stories ?? []);

  function createStoryBuckets(stories: Array<IStory>) {
    const now = DateTime.now();
    function isInBucket(bucket: NewsBucket, story: IStory) {
      const timestamp = DateTime.fromISO(story.timestamp);
      const ageInMin = now.diff(timestamp).as('minutes');
      const { minAgeInMin, maxAgeInMin } = bucket;
      return minAgeInMin <= ageInMin && (!maxAgeInMin || maxAgeInMin > ageInMin);
    }

    const buckets: Array<NewsBucket> = [
      {
        name: 'Aktuell',
        minAgeInMin: 0,
        maxAgeInMin: 120,
        stories: [],
      },
      {
        name: 'Letzte 24h',
        minAgeInMin: 120,
        maxAgeInMin: 1440,
        stories: [],
      },
      {
        name: 'Letzte 48h',
        minAgeInMin: 1440,
        maxAgeInMin: 2880,
        stories: [],
      },
      {
        name: 'Vor 7 Tagen',
        minAgeInMin: 2880,
        maxAgeInMin: 10080,
        stories: [],
      },
      {
        name: 'Archiv',
        minAgeInMin: 10080,
        stories: [],
      },
    ];
    stories.forEach((story) => {
      for (const bucket of buckets) {
        if (isInBucket(bucket, story)) {
          bucket.stories.push(story);
          break;
        }
      }
    });
    return buckets;
  }
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
