<script lang="ts">
  import classNames from 'classnames';

  export let type: 'button' | 'reset' | 'submit' = 'button';
  export let btnType: 'primary' | 'link' = 'primary';
  export let iconOnly = false;
  export let disabled: boolean | undefined = undefined;

  const primaryClass = classNames([
    'text-white bg-blue-800 hover:bg-blue-700 disabled:bg-gray-600',
    'outline-hidden focus:outline outline-2 outline-offset-2 outline-blue-700 disabled:outline-gray-600',
    'shadow-lg',
  ]);

  const linkClass = classNames([
    'text-blue-800 hover:text-blue-600 hover:bg-blue-100',
    'outline-hidden focus:outline outline-2 outline-blue-800',
    'hover:shadow-lg',
  ]);

  const buttonClass = classNames([
    'flex justify-center',
    iconOnly ? 'p-2' : 'px-3 py-2',
    !iconOnly && 'w-28 min-w-fit',
    btnType === 'primary' && primaryClass,
    btnType === 'link' && linkClass,
    'rounded-md',
    $$props['class'],
  ]);
</script>

<button class={buttonClass} {type} {disabled} on:click on:keydown>
  <slot />
</button>
