<script lang="ts">
  import classNames from 'classnames';

  export let type: 'button' | 'reset' | 'submit' = 'button';
  export let disabled: boolean | undefined = undefined;

  const buttonClass = classNames([
    'px-3 py-2',
    'w-28 min-w-fit',
    'text-white bg-blue-800 hover:bg-blue-700 disabled:bg-gray-600',
    'outline-hidden focus:outline outline-2 outline-offset-2 outline-blue-700 disabled:outline-gray-600',
    'rounded-lg',
  ]);
</script>

<button class={buttonClass} {type} {disabled} on:click>
  <slot />
</button>
