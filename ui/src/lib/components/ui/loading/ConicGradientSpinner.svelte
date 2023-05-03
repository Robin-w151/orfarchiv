<script lang="ts">
  import clsx from 'clsx';

  let clazz: string | undefined = undefined;
  export { clazz as class };

  const spinnerClass = clsx([`flex justify-center items-center`, `w-6 h-6`, `rounded-full animate-spin`, clazz]);
</script>

<div class="spinner {spinnerClass}" />

<style lang="postcss">
  .spinner {
    background: conic-gradient(
      transparent 0deg,
      theme('colors.fuchsia.600') 90deg,
      theme('colors.violet.600') 180deg,
      theme('colors.blue.700') 270deg,
      transparent 355deg
    );
  }

  :global(.dark) .spinner {
    background: conic-gradient(
      transparent 0deg,
      theme('colors.fuchsia.400') 90deg,
      theme('colors.violet.500') 180deg,
      theme('colors.blue.500') 270deg,
      transparent 355deg
    );
  }
</style>
