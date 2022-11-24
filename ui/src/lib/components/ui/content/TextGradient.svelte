<script lang="ts">
  import clsx from 'clsx';

  export let fromColorClass = 'from-fuchsia-600 dark:from-fuchsia-400';
  export let toColorClass = 'to-blue-700 dark:to-blue-500';

  const textClass = `
    text-transparent bg-gradient-to-r bg-clip-text
  `;
  const textClass$ = clsx([fromColorClass, toColorClass]);
</script>

<span class="{textClass} {textClass$}">
  <slot />
</span>
