<script lang="ts">
  import classNames from 'classnames';
  import computeScrollIntoView from 'compute-scroll-into-view';
  import { defaultPadding } from '$lib/utils/styles';

  export let noGap = false;
  export let noPadding = false;

  let itemRef;

  const itemClass = classNames([
    'flex flex-col',
    !noGap && 'gap-3',
    !noPadding && defaultPadding,
    'text-gray-800 dark:text-gray-300',
    'outline-none',
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
