<script lang="ts">
  import { fade } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
</script>

<div class={$$props['class']} in:fade={{ duration: 150, easing: cubicInOut }}>
  <slot />
</div>
