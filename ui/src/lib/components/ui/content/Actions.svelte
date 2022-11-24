<script lang="ts">
  import clsx from 'clsx';

  const actionsClass = clsx(['flex justify-center gap-2', 'w-full']);
</script>

<div class={actionsClass}>
  <slot />
</div>
