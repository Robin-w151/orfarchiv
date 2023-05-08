<script lang="ts">
  import { type BtnType, buttonClassFn, type Size } from './button.styles';

  export let type: 'button' | 'reset' | 'submit' = 'button';
  export let btnType: BtnType = 'primary';
  export let size: Size = 'normal';
  export let iconOnly = false;
  export let round = false;
  export let disabled: boolean | undefined = undefined;
  export let title: string | undefined = undefined;

  let buttonRef: HTMLButtonElement;
  let clazz: string | undefined = undefined;
  export { clazz as class };
  export let customStyle = false;

  $: buttonClass = buttonClassFn({
    btnType,
    size,
    iconOnly,
    round,
    clazz,
    customStyle,
  });

  export function focus(): void {
    buttonRef.focus();
  }
</script>

<button class={buttonClass} {type} {disabled} {title} on:click on:keydown bind:this={buttonRef}>
  <slot />
</button>
