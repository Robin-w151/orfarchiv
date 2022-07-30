<script lang="ts">
  import classNames from 'classnames';
  import type { CategoryColor } from '../../../models/categoryColor';
  import computeScrollIntoView from 'compute-scroll-into-view';

  export let categoryColor: CategoryColor | undefined = undefined;

  let itemRef;

  const itemClass = classNames([
    'flex flex-col gap-3',
    'px-3 sm:px-6 py-3',
    'text-gray-800',
    'outline-none',
    categoryColor?.bgClass,
    $$props['class'],
  ]);

  export function scrollIntoView(): void {
    const actions = computeScrollIntoView(itemRef, { scrollMode: 'if-needed', block: 'start' });
    const canSmoothScroll = 'scrollBehavior' in document.body.style;
    actions.forEach(({ el, top, left }) => {
      const topWithOffset = Math.max(top - 80, 0);
      if (el.scroll && canSmoothScroll) {
        el.scroll({ top: topWithOffset, left, behavior: 'smooth' });
      } else {
        el.scrollTop = topWithOffset;
        el.scrollLeft = left;
      }
    });
  }
</script>

<div class={itemClass} on:click on:keydown bind:this={itemRef}>
  <slot />
</div>
