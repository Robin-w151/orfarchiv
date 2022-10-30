<script lang="ts">
  export let href: string;
  export let target: string | undefined = '_blank';

  const linkClass = `
    text-blue-800 dark:text-blue-500 dark:hover:text-blue-700 hover:bg-blue-100
    focus:bg-blue-100 outline-none
    cursor-pointer
  `;
</script>

<a class={linkClass} {href} {target}>
  <slot />
</a>
