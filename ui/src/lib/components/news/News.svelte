<script lang="ts">
  import news from '../../stores/news';
  import Story from './Story.svelte';
  import { DateTime } from 'luxon';
  import { onDestroy, onMount } from 'svelte';
  import { newsClass, bucketClass, bucketTitleClass, newsLoadingWrapperClass } from './News.styles';
  import type { Story as IStory } from '../../models/story';
  import type { News, NewsBucket } from '../../models/news';
  import LoadingIndicator from '../ui/LoadingIndicator.svelte';
  import { getNews } from '../../api/news';

  let newsPromise: Promise<News> | null = null;
  $: storyBuckets = createStoryBuckets($news?.stories ?? []);

  onMount(async () => {
    newsPromise = getNews();
    news.setNews(await newsPromise);
  });

  onDestroy(() => {
    news.setNews(null);
  });

  function createStoryBuckets(stories: Array<IStory>) {
    // const now = DateTime.now(); // FIXME
    const now = DateTime.fromISO('2022-07-18T16:20:00+02:00');
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
  {#await newsPromise}
    <div class={newsLoadingWrapperClass}>
      <LoadingIndicator />
    </div>
  {:then _}
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
  {/await}
</div>
