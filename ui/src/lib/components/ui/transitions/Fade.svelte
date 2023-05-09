<script lang="ts">
  import { transitionDefaults } from '$lib/utils/styles';
  import { fade } from 'svelte/transition';
</script>

<div class={$$props['class']} in:fade={transitionDefaults}>
  <slot />
</div>
