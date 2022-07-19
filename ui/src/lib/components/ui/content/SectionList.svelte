<script lang="ts">
  import classNames from 'classnames';

  const listClass = classNames(['w-full', 'overflow-hidden', 'bg-white', 'divide-y-2 divide-solid', 'rounded-lg']);
</script>

<ul class={listClass}>
  <slot />
</ul>
