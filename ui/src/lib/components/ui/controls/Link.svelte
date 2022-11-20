<script lang="ts">
  export let href: string;
  export let target: string | undefined = '_blank';

  let clazz: string | undefined = undefined;
  export { clazz as class };
  export let customStyle = false;

  let rel = target === '_blank' ? 'noopener noreferrer' : undefined;

  const linkClass = customStyle
    ? clazz
    : `
    text-blue-800 dark:text-blue-500 dark:hover:text-blue-700 hover:bg-blue-100
    focus:bg-blue-100 outline-none
    cursor-pointer
    ${clazz}
  `;
</script>

<a class={linkClass} {href} {target} {rel}>
  <slot />
</a>
