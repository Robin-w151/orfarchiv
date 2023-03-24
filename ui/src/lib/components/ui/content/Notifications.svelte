<script lang="ts">
  import notifications from '$lib/stores/notifications';
  import { defaultGap } from '$lib/utils/styles';
  import Notification from './Notification.svelte';

  const notificationsClass = `
    flex flex-col items-center ${defaultGap}
    fixed left-8 bottom-4 right-8
  `;
</script>

<section class={notificationsClass} id="notifications">
  {#each $notifications as notification}
    <Notification {notification} />
  {/each}
</section>
