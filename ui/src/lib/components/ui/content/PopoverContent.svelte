<script lang="ts">
  import { rollFade } from '$lib/utils/transitions';
  import AccessibleTransition from '../transitions/AccessibleTransition.svelte';

  let contentClass: string;
  $: contentClass = `
    bg-white dark:bg-gray-900/80 dark:backdrop-blur-sm
    rounded-lg shadow-md dark:shadow-2xl
    ${$$props['class']}
  `;
</script>

<AccessibleTransition class={contentClass} transition={rollFade}>
  <slot />
</AccessibleTransition>
