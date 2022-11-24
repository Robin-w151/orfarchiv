<script lang="ts">
  import clsx from 'clsx';

  const listClass = clsx([
    'w-full',
    'bg-white dark:bg-gray-900',
    'divide-y-2 divide-solid divide-gray-200 dark:divide-gray-700',
    $$props['class'],
  ]);
</script>

<ul class={listClass}>
  <slot />
</ul>
