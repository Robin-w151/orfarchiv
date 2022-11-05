<script lang="ts">
  import classNames from 'classnames';

  export let id: string | undefined = undefined;

  const contentClass = classNames(['flex flex-col gap-2 sm:gap-3 items-center']);
</script>

<div class={contentClass} {id}>
  <slot />
</div>
