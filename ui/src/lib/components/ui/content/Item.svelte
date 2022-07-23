<script lang="ts">
  import classNames from 'classnames';
  import type { CategoryColor } from '../../../models/categoryColor';

  export let href: string | undefined = undefined;
  export let target: string | undefined = '_blank';
  export let categoryColor: CategoryColor | undefined = undefined;

  const itemClass = classNames([
    'flex flex-col',
    'px-6 py-3',
    'text-gray-800',
    categoryColor?.bgClass,
    href && (categoryColor?.bgHoverClass ?? 'hover:bg-gray-100 focus:bg-gray-100 outline-none'),
  ]);
</script>

{#if href}
  <a {href} {target} class={itemClass}>
    <slot />
  </a>
{:else}
  <div class={itemClass}>
    <slot />
  </div>
{/if}
