<script lang="ts">
  let contentClass: string;
  $: contentClass = `
    bg-white dark:bg-gray-900/80 dark:backdrop-blur-sm
    rounded-lg shadow-md dark:shadow-2xl
    ${$$props['class']}
  `;
</script>

<div class={contentClass}>
  <slot />
</div>
