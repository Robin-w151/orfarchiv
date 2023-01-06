<script lang="ts">
  import { Popover, PopoverButton, PopoverPanel, Portal } from '@rgossiaux/svelte-headlessui';
  import { createPopperActions } from 'svelte-popperjs';
  import { type BtnType, buttonClassFn, type Size } from '../controls/button.styles';
  import clsx from 'clsx';

  export let btnType: BtnType = 'primary';
  export let size: Size = 'normal';
  export let iconOnly = false;
  export let title: string | undefined = undefined;
  export let disabled: boolean | undefined = undefined;
  export let placement = 'bottom';

  const [popperRef, popperContent] = createPopperActions();
  const popperOptions = {
    placement,
    strategy: 'absolute',
    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
  };

  $: dropdownButtonClass = buttonClassFn({ btnType, size, iconOnly });
  const dropdownContentClass = clsx(['z-40']);
</script>

<Popover let:open>
  <PopoverButton class={dropdownButtonClass} use={[popperRef]} {disabled} {title}>
    <slot name="button-content" />
  </PopoverButton>
  {#if open}
    <Portal>
      <PopoverPanel class={dropdownContentClass} use={[[popperContent, popperOptions]]} let:close>
        <slot name="content" onClose={close} />
      </PopoverPanel>
    </Portal>
  {/if}
</Popover>
