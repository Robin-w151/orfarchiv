<script lang="ts">
  import classNames from 'classnames';
  import { defaultPadding } from '$lib/utils/styles';
  import ThreeDotsLoadingIndicator from '$lib/components/ui/loading/ThreeDotsLoadingIndicator.svelte';

  export let title: string;
  export let isLoading = false;

  const sectionClass = classNames(['flex flex-col items-center', 'w-full', 'bg-white', 'overflow-clip']);
  const titleClass = classNames([
    'flex gap-2 justify-center items-center sticky top-0 z-20',
    defaultPadding,
    'w-full text-lg',
    'text-blue-900 bg-white/80',
    'border-solid border-b-2',
    'backdrop-blur-sm',
  ]);
  const contentClass = classNames(['w-full']);
</script>

<div class={sectionClass}>
  {#if title}
    <div class={titleClass}>
      {#if isLoading}
        <ThreeDotsLoadingIndicator class="h-7" />
      {:else}
        <h2>{title}</h2>
      {/if}
    </div>
  {/if}
  <div class={contentClass}>
    <slot />
  </div>
</div>
