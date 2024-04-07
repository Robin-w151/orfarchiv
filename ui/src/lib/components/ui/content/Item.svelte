<script lang="ts">
  import clsx from 'clsx';
  import computeScrollIntoView from '$lib/utils/computeScrollIntoView';
  import { defaultPadding } from '$lib/utils/styles';

  export let noFlex = false;
  export let noColumn = false;
  export let noGap = false;
  export let noPadding = false;

  let clazz: string | undefined = undefined;
  export { clazz as class };

  let itemRef: HTMLLIElement;

  const itemClass = clsx([
    !noFlex && 'flex',
    noColumn ? 'flex-row items-center justify-between' : 'flex-col',
    !noGap && 'gap-3',
    !noPadding && defaultPadding,
    'text-gray-800 dark:text-gray-300',
    'outline-none',
    clazz,
  ]);

  export function scrollIntoView(): void {
    const actions = computeScrollIntoView(itemRef, {
      scrollMode: 'if-needed',
      block: 'start',
      viewportInset: { y: 80 },
    });
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

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<li class={itemClass} on:click on:keydown bind:this={itemRef}>
  <slot />
</li>
