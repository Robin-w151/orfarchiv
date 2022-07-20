<script lang="ts">
  import classNames from 'classnames';

  const actionsClass = classNames(['flex justify-end gap-2', 'w-full']);
</script>

<div class={actionsClass}>
  <slot />
</div>
