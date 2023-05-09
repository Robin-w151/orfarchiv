<script lang="ts">
  import type { OANotification } from '$lib/models/notifications';
  import notifications from '$lib/stores/notifications';
  import { defaultGap, defaultPadding } from '$lib/utils/styles';
  import { onMount } from 'svelte';
  import CheckIcon from '../icons/outline/CheckIcon.svelte';
  import XIcon from '../icons/outline/XIcon.svelte';
  import Button from './Button.svelte';
  import AccessibleTransition from '../transitions/AccessibleTransition.svelte';

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
  const contentClass = `
    flex flex-col ${defaultGap}
  `;
  const actionsClass = `
    flex items-center ${defaultGap}
  `;

  let closeButtonRef: Button;

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

  function handleAcceptClick(event: Event): void {
    event.stopPropagation();
    notifications.accept(notification.id);
  }

  function handleCloseClick(event: Event): void {
    event.stopPropagation();
    notifications.remove(notification.id);
  }
</script>

<AccessibleTransition class={notificationClass} onlyIn>
  <div class={contentClass}>
    <strong>{notification.title}</strong>
    <span>{notification.text}</span>
  </div>
  <div class={actionsClass}>
    {#if notification.options?.onAccept}
      <Button btnType="monochrome" iconOnly round title="Bestätigen" on:click={handleAcceptClick}>
        <CheckIcon />
      </Button>
    {/if}
    <Button
      btnType="monochrome"
      iconOnly
      round
      title="Schließen"
      on:click={handleCloseClick}
      bind:this={closeButtonRef}
    >
      <XIcon />
    </Button>
  </div>
</AccessibleTransition>
