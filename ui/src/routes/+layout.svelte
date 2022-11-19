<script lang="ts">
  import Header from '$lib/components/ui/content/Header.svelte';
  import EnableAnalytics from '$lib/components/utils/EnableAnalytics.svelte';
  import EnableDarkMode from '$lib/components/utils/EnableDarkMode.svelte';
  import EnableGlobalKeybindings from '$lib/components/utils/EnableGlobalKeybindings.svelte';
  import '../app.scss';

  const wrapperClass = `
    flex flex-col gap-2 sm:gap-3
    p-2 pb-4 sm:p-4
    w-screen max-w-screen-lg
  `;
  const mainClass = 'flex flex-col gap-2 sm:gap-3';
</script>

<EnableDarkMode />
<EnableAnalytics />
<EnableGlobalKeybindings />

<div class={wrapperClass}>
  <Header />
  <main class={mainClass}>
    <slot />
  </main>
</div>
