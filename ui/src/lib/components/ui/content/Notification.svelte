<script lang="ts">
  import type { Notification } from '$lib/models/notifications';
  import notifications from '$lib/stores/notifications';
  import { defaultGap, defaultPadding } from '$lib/utils/styles';
  import { onMount } from 'svelte';
  import CheckIcon from '../icons/outline/CheckIcon.svelte';
  import XIcon from '../icons/outline/XIcon.svelte';

  export let notification: Notification;

  const notificationClass = `
    flex justify-between items-center ${defaultGap}
    ${defaultPadding}
    w-full max-w-[768px]
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

  function close(): void {
    notifications.remove(notification.id);
  }

  function focusLatestNotification(notifications: Array<Notification>): void {
    if (notification.id === notifications[notifications.length - 1]?.id) {
      focus();
    }
  }

  function handleAcceptClick(): void {
    notification.action?.();
    close();
  }

  function handleCloseClick(): void {
    close();
  }
</script>

<div class={notificationClass}>
  <span>{notification.text}</span>
  <div class={actionsClass}>
    {#if notification.action}
      <button class={buttonClass} type="button" on:click|stopPropagation={handleAcceptClick}>
        <CheckIcon />
      </button>
    {/if}
    <button class={buttonClass} type="button" on:click|stopPropagation={handleCloseClick} bind:this={closeButtonRef}>
      <XIcon />
    </button>
  </div>
</div>
