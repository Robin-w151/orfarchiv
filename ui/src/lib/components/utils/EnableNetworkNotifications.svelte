<script lang="ts">
  import notifications from '$lib/stores/notifications';
  import { onlineStore } from 'svelte-legos';

  const online = onlineStore();
  $: warnIfOffline($online);

  function warnIfOffline(online: boolean) {
    if (!online) {
      notifications.notify('Verbindung mit dem Internet wurde unterbrochen! Überprüfen Sie die Netzwerkeinstellungen.');
    }
  }
</script>
