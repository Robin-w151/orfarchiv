<script lang="ts">
  import type { OANotification } from '$lib/models/notifications';
  import notifications from '$lib/stores/notifications';
  import { defaultGap, defaultPadding } from '$lib/utils/styles';
  import { onMount } from 'svelte';
  import CheckIcon from '../icons/outline/CheckIcon.svelte';
  import XIcon from '../icons/outline/XIcon.svelte';
  import Fade from '../transitions/Fade.svelte';

  export let notification: OANotification;

  const notificationClass = `
    flex justify-between items-center ${defaultGap}
    ${defaultPadding}
    w-full max-w-[768px]
    text-gray-900 dark:text-gray-200
    bg-gray-100 dark:bg-gray-800
    focus:outline-none focus:ring-2 ring-blue-700 dark:ring-blue-500
    rounded-lg shadow-md dark:shadow-2xl
  `;
  const actionsClass = `
    flex items-center ${defaultGap}
  `;
  const buttonClass = `
    p-1
    text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700
    focus:outline-none focus:ring-2 ring-blue-700 dark:ring-blue-500
    rounded-full
    transition
  `;

  let closeButtonRef: HTMLButtonElement;

  $: focusLatestNotification($notifications);

  onMount(() => {
    focus();
  });

  function focus(): void {
    closeButtonRef?.focus();
  }

  function focusLatestNotification(notifications: Array<OANotification>): void {
    if (notification.id === notifications[notifications.length - 1]?.id) {
      focus();
    }
  }

  function handleAcceptClick(): void {
    notifications.accept(notification.id);
  }

  function handleCloseClick(): void {
    notifications.remove(notification.id);
  }
</script>

<Fade class={notificationClass}>
  <span>{notification.title}. {notification.text}</span>
  <div class={actionsClass}>
    {#if notification.options?.onAccept}
      <button class={buttonClass} type="button" title="Bestätigen" on:click|stopPropagation={handleAcceptClick}>
        <CheckIcon />
      </button>
    {/if}
    <button
      class={buttonClass}
      type="button"
      title="Schließen"
      on:click|stopPropagation={handleCloseClick}
      bind:this={closeButtonRef}
    >
      <XIcon />
    </button>
  </div>
</Fade>
