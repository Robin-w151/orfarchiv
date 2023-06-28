<script lang="ts">
  import DateInput from '$lib/components/ui/controls/DateInput.svelte';
  import TextGradient from '$lib/components/ui/content/TextGradient.svelte';
  import CalendarIcon from '$lib/components/ui/icons/outline/CalendarIcon.svelte';
  import { createEventDispatcher } from 'svelte';
  import type { DateTime } from 'luxon';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import PopoverContent from '$lib/components/ui/content/PopoverContent.svelte';
  import FunnelIcon from '$lib/components/ui/icons/outline/FunnelIcon.svelte';
  import Popover from '$lib/components/ui/content/Popover.svelte';

  export let from: DateTime | undefined;
  export let to: DateTime | undefined;

  const dispatch = createEventDispatcher();

  const menuClass = `
    flex flex-col items-center gap-5
    p-3 w-80
    text-blue-700 dark:text-blue-500
  `;
  const menuSectionClass = `flex flex-col gap-3 w-full`;
  const menuSectionTitleClass = `flex gap-2 text-lg text-fuchsia-600 dark:text-fuchsia-400`;
  const menuSectionItemClass = `flex flex-col items-center gap-1 w-full`;
  const menuActionsClass = `grid grid-cols-2 gap-x-3 gap-y-2 w-full`;
  const menuButtonClass = `!w-full`;

  $: fromDate = from?.toISODate();
  $: toDate = to?.toISODate();

  function handleFromChange({ detail: from }: { detail: string }) {
    dispatch('fromChange', from);
  }

  function handleToChange({ detail: to }: { detail: string }) {
    dispatch('toChange', to);
  }

  function handleApplyClick() {
    dispatch('apply');
  }

  function handleResetClick() {
    dispatch('reset');
  }

  function handleSelectTodayClick() {
    dispatch('selectToday');
  }

  function handleSelectLastWeekClick() {
    dispatch('selectLastWeek');
  }

  function handleSelectLastMonthClick() {
    dispatch('selectLastMonth');
  }

  function handleSelectLastYearClick() {
    dispatch('selectLastYear');
  }
</script>

<Popover btnType="secondary" iconOnly title="Weitere Filter-Optionen" placement="bottom-end">
  <FunnelIcon slot="button-content" />
  <PopoverContent class={menuClass} slot="content" let:onClose>
    <section class={menuSectionClass}>
      <span class={menuSectionTitleClass}>
        <CalendarIcon />
        <TextGradient>Zeitraum</TextGradient>
      </span>
      <div class={menuActionsClass}>
        <Button class={menuButtonClass} btnType="secondary" size="small" on:click={handleSelectTodayClick}>Heute</Button
        >
        <Button class={menuButtonClass} btnType="secondary" size="small" on:click={handleSelectLastWeekClick}
          >Letzte Woche</Button
        >
        <Button class={menuButtonClass} btnType="secondary" size="small" on:click={handleSelectLastMonthClick}
          >Letzter Monat</Button
        >
        <Button class={menuButtonClass} btnType="secondary" size="small" on:click={handleSelectLastYearClick}
          >Letztes Jahr</Button
        >
      </div>
      <div class={menuSectionItemClass}>
        <label for="from-input">Von</label>
        <DateInput id="from-input" value={fromDate} on:change={handleFromChange} />
      </div>
      <div class={menuSectionItemClass}>
        <label for="to-input">Bis</label>
        <DateInput id="to-input" value={toDate} on:change={handleToChange} />
      </div>
    </section>
    <div class={menuActionsClass}>
      <Button
        class={menuButtonClass}
        btnType="secondary"
        on:click={() => {
          handleResetClick();
          onClose();
        }}>Zurücksetzen</Button
      >
      <Button
        class={menuButtonClass}
        on:click={() => {
          handleApplyClick();
          onClose();
        }}>Anwenden</Button
      >
    </div>
  </PopoverContent>
</Popover>
