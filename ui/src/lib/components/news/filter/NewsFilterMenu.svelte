<script lang="ts">
  import DateInput from '$lib/components/ui/controls/DateInput.svelte';
  import TextGradient from '$lib/components/ui/content/TextGradient.svelte';
  import CalendarIcon from '$lib/components/ui/icons/outline/CalendarIcon.svelte';
  import searchFilter from '$lib/stores/searchFilter';

  const menuClass = `
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

  $: fromDate = $searchFilter.from?.toISODate();
  $: toDate = $searchFilter.to?.toISODate();

  function handleFromChange({ detail: from }) {
    searchFilter.setFrom(from);
  }

  function handleToChange({ detail: to }) {
    searchFilter.setTo(to);
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
</div>
