<script lang="ts">
  import classNames from 'classnames';
  import stories from './news.data.js';
  import Story from './Story.svelte';

  const newsClass = classNames(['overflow-hidden', 'bg-white', 'divide-y-2 divide-solid', 'rounded-lg']);
  const timeSeparatorClass = classNames(['mb-2 px-3 py-2', 'text-gray-800 bg-white', 'rounded-lg']);
</script>

<div class={timeSeparatorClass}>Aktuell</div>
<ul class={newsClass}>
  {#each stories as story (story.id)}
    <li>
      <Story {...story} />
    </li>
  {/each}
</ul>
