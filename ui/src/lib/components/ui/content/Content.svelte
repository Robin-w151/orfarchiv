<script lang="ts">
  import clsx from 'clsx';

  export let id: string | undefined = undefined;

  const contentClass = clsx(['flex flex-col gap-2 sm:gap-3 items-center']);
</script>

<div class={contentClass} {id}>
  <slot />
</div>
