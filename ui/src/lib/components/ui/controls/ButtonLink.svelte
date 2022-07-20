<script lang="ts">
  export let href: string = undefined;
  export let target: string = undefined;
</script>

{#if href}
  <a {href} {target}>
    <slot />
  </a>
{:else}
  <button on:click><slot /></button>
{/if}
