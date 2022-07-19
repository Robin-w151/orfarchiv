<script lang="ts">
  import classNames from 'classnames';

  const contentClass = classNames(['flex flex-col gap-3 items-center']);
</script>

<div class={contentClass}>
  <slot />
</div>
