<script lang="ts">
  import { Popover, PopoverButton, PopoverPanel, Portal } from '@rgossiaux/svelte-headlessui';
  import { createPopperActions } from 'svelte-popperjs';
  import { type BtnType, buttonClassFn } from './button.styles';
  import classNames from 'classnames';
  import type { PopperOptions } from 'svelte-popperjs';

  export let btnType: BtnType = 'primary';
  export let iconOnly = false;
  export let disabled: boolean | undefined = undefined;
  export let placement = 'bottom';

  const [popperRef, popperContent] = createPopperActions();
  const popperOptions: PopperOptions = {
    placement,
    strategy: 'absolute',
    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
  };

  $: dropdownButtonClass = buttonClassFn({ btnType, iconOnly, disabled });
  const dropdownContentClass = classNames(['z-40']);
</script>

<Popover let:open>
  <PopoverButton class={dropdownButtonClass} use={[popperRef]} {disabled}>
    <slot name="button" />
  </PopoverButton>
  {#if open}
    <Portal>
      <PopoverPanel class={dropdownContentClass} use={[[popperContent, popperOptions]]} let:close>
        <slot name="content" onClose={close} />
      </PopoverPanel>
    </Portal>
  {/if}
</Popover>
