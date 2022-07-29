<script lang="ts">
  import classNames from 'classnames';
  import type { CategoryColor } from '../../../models/categoryColor';

  export let categoryColor: CategoryColor | undefined = undefined;

  const itemClass = classNames([
    'flex flex-col gap-3',
    'px-3 sm:px-6 py-3',
    'text-gray-800',
    'outline-none',
    categoryColor?.bgClass,
    categoryColor?.bgHoverClass ?? 'hover:bg-gray-100 focus:bg-gray-100',
    $$props['class'],
  ]);
</script>

<div class={itemClass} on:click>
  <slot />
</div>
