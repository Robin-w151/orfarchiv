<script lang="ts">
  import DateInput from '$lib/components/ui/controls/DateInput.svelte';
  import TextGradient from '$lib/components/ui/content/TextGradient.svelte';
  import CalendarIcon from '$lib/components/ui/icons/outline/CalendarIcon.svelte';
  import { createEventDispatcher } from 'svelte';
  import type { DateTime } from 'luxon';
  import Button from '$lib/components/ui/controls/Button.svelte';

  export let from: DateTime;
  export let to: DateTime;
  export let onClose: () => void;

  const dispatch = createEventDispatcher();

  const menuClass = `
    flex flex-col items-center gap-3
    p-3
    w-64
    text-blue-700 bg-white
    rounded-lg shadow-md
  `;
  const menuSectionClass = `
    flex flex-col gap-3
    w-full
  `;
  const menuSectionTitleClass = `
    flex gap-2
    text-lg
    text-fuchsia-600
  `;
  const menuSectionItemClass = `
    flex flex-col items-center gap-1
    w-full
  `;
  const menuSectionLabelClass = `
  `;

  $: fromDate = from?.toISODate();
  $: toDate = to?.toISODate();

  function handleFromChange({ detail: from }) {
    dispatch('fromChange', from);
  }

  function handleToChange({ detail: to }) {
    dispatch('toChange', to);
  }

  function handleApplyClick() {
    dispatch('apply');
    onClose();
  }
</script>

<div class={menuClass}>
  <section class={menuSectionClass}>
    <span class={menuSectionTitleClass}>
      <CalendarIcon />
      <TextGradient>Zeitraum</TextGradient>
    </span>
    <div class={menuSectionItemClass}>
      <label class={menuSectionLabelClass} for="from-input">Von</label>
      <DateInput id="from-input" value={fromDate} on:change={handleFromChange} />
    </div>
    <div class={menuSectionItemClass}>
      <label class={menuSectionLabelClass} for="to-input">Bis</label>
      <DateInput id="to-input" value={toDate} on:change={handleToChange} />
    </div>
  </section>
  <Button on:click={handleApplyClick}>Anwenden</Button>
</div>
