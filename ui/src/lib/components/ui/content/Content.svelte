<script lang="ts">
  export let id: string | undefined = undefined;

  const contentClass = 'flex flex-col gap-2 sm:gap-3 items-center';
</script>

<div class={contentClass} {id}>
  <slot />
</div>
