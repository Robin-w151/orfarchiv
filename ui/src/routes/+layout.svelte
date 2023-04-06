<script lang="ts">
  import Header from '$lib/components/ui/content/Header.svelte';
  import Notifications from '$lib/components/ui/controls/Notifications.svelte';
  import EnableAnalytics from '$lib/components/utils/EnableAnalytics.svelte';
  import EnableDarkMode from '$lib/components/utils/EnableDarkMode.svelte';
  import EnableGlobalKeybindings from '$lib/components/utils/EnableGlobalKeybindings.svelte';
  import EnableNetworkNotifications from '$lib/components/utils/EnableNetworkNotifications.svelte';
  import { defaultScreenSize } from '$lib/utils/styles';
  import '../app.scss';

  const wrapperClass = `
    flex flex-col gap-2 sm:gap-3
    p-2 pb-4 sm:p-4
    ${defaultScreenSize}
  `;
  const mainClass = 'flex flex-col gap-2 sm:gap-3';
</script>

<EnableDarkMode />
<EnableAnalytics />
<EnableGlobalKeybindings />
<EnableNetworkNotifications />

<div class={wrapperClass}>
  <Notifications />
  <Header />
  <main class={mainClass}>
    <slot />
  </main>
</div>
