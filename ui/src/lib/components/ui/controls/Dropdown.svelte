<script lang="ts">
  import { Popover, PopoverButton, PopoverPanel, Portal } from '@rgossiaux/svelte-headlessui';
  import { createPopperActions } from 'svelte-popperjs';
  import { type BtnType, buttonClassFn } from './button.styles';

  export let btnType: BtnType = 'primary';
  export let iconOnly = false;
  export let disabled: boolean | undefined = undefined;

  const [popperRef, popperContent] = createPopperActions();
  const popperOptions = {
    placement: 'bottom-end',
    strategy: 'absolute',
    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
  };

  const dropdownButtonClass = buttonClassFn({ btnType, iconOnly });
</script>

<Popover let:open>
  <PopoverButton class={dropdownButtonClass} use={[popperRef]} {disabled}>
    <slot name="button" />
  </PopoverButton>
  {#if open}
    <Portal>
      <PopoverPanel use={[[popperContent, popperOptions]]} let:close>
        <slot name="content" onClose={close} />
      </PopoverPanel>
    </Portal>
  {/if}
</Popover>
