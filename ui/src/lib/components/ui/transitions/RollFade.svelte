<script lang="ts">
  import settings from '$lib/stores/settings';
  import { rollFade, transitionDefaults } from '$lib/utils/styles';
  import { fade } from 'svelte/transition';

  $: transition = $settings.forceReducedMotion ? fade : rollFade;
  $: transitionProps = $settings.forceReducedMotion ? transitionDefaults : undefined;
</script>

<div class={$$props['class']} transition:transition={transitionProps}>
  <slot />
</div>
