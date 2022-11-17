<script lang="ts">
  import NewspaperIcon from '$lib/components/ui/icons/outline/NewspaperIcon.svelte';
  import type { Story } from '$lib/models/story';

  export let story: Story;
  export let onClose: () => void;

  let clazz: string;
  export { clazz as class };

  function handleOpenArticleClick() {
    onClose();
  }
</script>

<a class={clazz} href={story.url} target="_blank" rel="noopener noreferrer" on:click={handleOpenArticleClick}>
  <NewspaperIcon />
  <span>In orf.at öffnen</span>
</a>
