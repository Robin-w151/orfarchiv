<script lang="ts">
  import classNames from 'classnames';

  const listClass = classNames(['w-full', 'bg-white', 'divide-y-2 divide-solid', 'rounded-b-lg']);
</script>

<ul class={listClass}>
  <slot />
</ul>
