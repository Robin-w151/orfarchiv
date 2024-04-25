<script lang="ts">
  import { NOTIFICATION_NEW_VERSION_AVAILABLE } from '$lib/configs/client';
  import notifications from '$lib/stores/notifications';
  import { listenForUpdates } from '$lib/utils/updateListener';
  import { onMount } from 'svelte';

  let isRestarting = false;

  onMount(async () => {
    listenForUpdates(({ restart }) => {
      notifications.notify(
        'Neue Version verfügbar',
        'Möchten Sie die Applikation jetzt neu starten und aktualisieren?',
        {
          uniqueCategory: NOTIFICATION_NEW_VERSION_AVAILABLE,
          forceAppNotification: true,
          onAccept: () => {
            isRestarting = true;
            restart();
          },
        },
      );
    });
  });
</script>

{#if isRestarting}
  <div
    class="flex justify-center items-center fixed top-0 bottom-0 left-0 right-0 z-[9999] bg-surface-100/50 backdrop-blur-sm"
  >
    <div
      class="w-24 h-24 border-8 bg-surface-800 dark:bg-surface-100 !border-t-transparent rounded-full animate-spin"
    />
  </div>
{/if}
