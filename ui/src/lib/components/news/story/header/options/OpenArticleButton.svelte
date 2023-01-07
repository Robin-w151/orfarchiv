<script lang="ts">
  import Link from '$lib/components/ui/controls/Link.svelte';
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

<Link class={clazz} customStyle href={story.url} on:click={handleOpenArticleClick}>
  <NewspaperIcon />
  <span>In orf.at öffnen</span>
</Link>
