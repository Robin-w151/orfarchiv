<script lang="ts">
  import classNames from 'classnames';

  const listClass = classNames([
    'w-full',
    'bg-white dark:bg-gray-900',
    'divide-y-2 divide-solid divide-gray-200 dark:divide-gray-700',
    $$props['class'],
  ]);
</script>

<ul class={listClass}>
  <slot />
</ul>
