<script lang="ts">
  import notifications from '$lib/stores/notifications';
  import { onlineStore } from 'svelte-legos';

  const online = onlineStore();
  $: warnIfOffline($online);

  function warnIfOffline(online: boolean) {
    if (!online) {
      notifications.notify(
        'Verbindung unterbrochen',
        'Bitte überprüfen Sie Ihre Netzwerkeinstellungen und stellen Sie sicher, dass Sie mit dem Internet verbunden sind.',
        {
          forceAppNotification: true,
        },
      );
    }
  }
</script>
