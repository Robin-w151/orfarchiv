<script lang="ts">
  import stories from '../data/news.data';
  import news from '../stores/news';
  import Story from './Story.svelte';
  import { DateTime } from 'luxon';
  import { onMount } from 'svelte';
  import { newsClass, bucketClass, bucketTitleClass } from './News.styles';

  $: storyBuckets = createStoryBuckets($news.stories);

  onMount(() => {
    setTimeout(() => news.setNews({ stories }), 1000);
  });

  function createStoryBuckets(stories) {
    // const now = DateTime.now(); // FIXME
    const now = DateTime.fromISO('2022-07-14T00:05:00+02:00');
    function isInBucket(bucket, story) {
      const timestamp = DateTime.fromISO(story.timestamp);
      const ageInMin = now.diff(timestamp).as('minutes');
      const { minAgeInMin, maxAgeInMin } = bucket;
      return minAgeInMin <= ageInMin && (!maxAgeInMin || maxAgeInMin > ageInMin);
    }

    const buckets = [
      {
        name: 'Aktuell',
        minAgeInMin: 0,
        maxAgeInMin: 60,
        stories: [],
      },
      {
        name: 'Letzte 24h',
        minAgeInMin: 60,
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

<div class={newsClass}>
  {#each storyBuckets as bucket (bucket.name)}
    {#if bucket.stories.length > 0}
      <div class={bucketTitleClass}>{bucket.name}</div>
      <ul class={bucketClass}>
        {#each bucket.stories as story (story.id)}
          <li>
            <Story {...story} />
          </li>
        {/each}
      </ul>
    {/if}
  {/each}
</div>
