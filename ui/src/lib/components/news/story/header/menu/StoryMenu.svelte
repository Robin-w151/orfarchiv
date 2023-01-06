<script lang="ts">
  import PopoverContent from '$lib/components/ui/content/PopoverContent.svelte';
  import type { Story } from '$lib/models/story';
  import { defaultMenuClass, defaultMenuItemClass } from '$lib/utils/styles';
  import BookmarkButton from './BookmarkButton.svelte';
  import OpenArticleButton from './OpenArticleButton.svelte';
  import OpenSupportButton from './OpenSupportButton.svelte';
  import ShareButton from './ShareButton.svelte';

  export let story: Story;
  export let onClose: () => void;
</script>

<PopoverContent class={defaultMenuClass}>
  <OpenArticleButton class={defaultMenuItemClass} {story} {onClose} />
  <BookmarkButton class={defaultMenuItemClass} {story} {onClose} />
  <ShareButton class={defaultMenuItemClass} {story} {onClose} />
  <OpenSupportButton class={defaultMenuItemClass} {onClose} />
</PopoverContent>
