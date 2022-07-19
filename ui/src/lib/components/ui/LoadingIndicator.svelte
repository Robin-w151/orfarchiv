<script lang="ts">
  import classNames from 'classnames';

  export let large = false;

  const ringClass = classNames([
    'loading-ring',
    'flex justify-center items-center',
    'w-full h-full aspect-square',
    large ? 'border-8' : 'border-4',
    'border-current border-x-transparent border-solid',
    'rounded-full',
  ]);
  const innerRingClass = classNames([
    'loading-inner-ring',
    large ? 'w-11/12' : 'w-5/6',
    'aspect-square',
    large ? 'border-8' : 'border-4',
    'border-current border-y-transparent border-solid',
    'rounded-full',
  ]);
</script>

<div class={ringClass}>
  <div class={innerRingClass} />
</div>

<style>
  .loading-ring {
    animation: spin-ring 1.75s linear infinite;
  }

  .loading-inner-ring {
    animation: spin-inner-ring 0.75s linear infinite;
  }

  @keyframes spin-ring {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes spin-inner-ring {
    100% {
      transform: rotate(-360deg);
    }
  }
</style>
