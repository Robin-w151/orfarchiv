<script lang="ts">
  import settings from '$lib/stores/settings';
  import { transitionDefaults, useReducedMotion } from '$lib/utils/transitions';
  import { fade, type TransitionConfig } from 'svelte/transition';

  export let transition: (node: Element, props: any) => TransitionConfig = fade;
  export let transitionProps: TransitionConfig | undefined = undefined;
  export let onlyIn = false;

  $: transition = useReducedMotion() || $settings.forceReducedMotion ? fade : transition;
  $: transitionProps = useReducedMotion() || $settings.forceReducedMotion ? transitionDefaults : transitionProps;
</script>

{#if onlyIn}
  <div class={$$props['class']} in:transition|global={transitionProps}>
    <slot />
  </div>
{:else}
  <div class={$$props['class']} transition:transition|global={transitionProps}>
    <slot />
  </div>
{/if}
