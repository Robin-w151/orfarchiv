<script lang="ts">
  import notifications from '$lib/stores/notifications';
  import { defaultGap } from '$lib/utils/styles';
  import Notification from './Notification.svelte';

  const notificationsClass = `
    flex flex-col items-center ${defaultGap}
    fixed z-40 left-8 right-8 bottom-4 lg:bottom-8
  `;

  $: appNotifications = $notifications.filter((notification) => !notification.system);
</script>

<section class={notificationsClass} id="notifications">
  {#each appNotifications as notification}
    <Notification {notification} />
  {/each}
</section>
