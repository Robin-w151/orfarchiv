<script lang="ts">
  import { type BtnType, buttonClassFn } from './button.styles';

  export let type: 'button' | 'reset' | 'submit' = 'button';
  export let btnType: BtnType = 'primary';
  export let iconOnly = false;
  export let disabled: boolean | undefined = undefined;
  export let title: string | undefined = undefined;

  $: buttonClass = buttonClassFn({ btnType, iconOnly, clazz: $$props['class'] });
</script>

<button class={buttonClass} {type} {disabled} {title} on:click on:keydown>
  <slot />
</button>
