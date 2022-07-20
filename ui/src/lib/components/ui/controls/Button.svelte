<script lang="ts">
  import classNames from 'classnames';

  export let type: 'button' | 'reset' | 'submit' = 'button';

  const buttonClass = classNames([
    'px-3 py-2',
    'text-white bg-blue-800 hover:bg-blue-700',
    'outline-hidden focus:outline outline-2 outline-offset-2 outline-blue-700',
    'rounded-lg',
  ]);
</script>

<button class={buttonClass} {type} on:click>
  <slot />
</button>
