<script lang="ts">
  import PopoverContent from '$lib/components/ui/content/PopoverContent.svelte';
  import type { Story } from '$lib/models/story';
  import { defaultMenuClass, defaultMenuItemClass } from '$lib/utils/styles';
  import BookmarkButton from './BookmarkButton.svelte';
  import OpenArticleButton from './OpenArticleButton.svelte';
  import OpenSupportButton from './OpenSupportButton.svelte';
  import ShareButton from './ShareButton.svelte';
  import Popover from '$lib/components/ui/content/Popover.svelte';
  import EllipsisVerticalIcon from '$lib/components/ui/icons/outline/EllipsisVerticalIcon.svelte';

  export let story: Story;
</script>

<Popover btnType="secondary" iconOnly title="Weitere Optionen" placement="bottom-end">
  <EllipsisVerticalIcon slot="button-content" />
  <PopoverContent class={defaultMenuClass} slot="content" let:onClose>
    <OpenArticleButton class={defaultMenuItemClass} {story} {onClose} />
    <BookmarkButton class={defaultMenuItemClass} {story} {onClose} />
    <ShareButton class={defaultMenuItemClass} {story} {onClose} />
    <OpenSupportButton class={defaultMenuItemClass} {onClose} />
  </PopoverContent>
</Popover>
