<script lang="ts">
  import classNames from 'classnames';

  export let fromColorClass = 'from-fuchsia-600';
  export let toColorClass = 'to-blue-700';

  const textClass = `
    text-transparent bg-gradient-to-r bg-clip-text
  `;
  const textClass$ = classNames([fromColorClass, toColorClass]);
</script>

<span class="{textClass} {textClass$}">
  <slot />
</span>
