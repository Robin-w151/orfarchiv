<script lang="ts">
  import DateInput from '$lib/components/ui/controls/DateInput.svelte';
  import TextGradient from '$lib/components/ui/content/TextGradient.svelte';
  import CalendarIcon from '$lib/components/ui/icons/outline/CalendarIcon.svelte';
  import searchFilter from '$lib/stores/searchFilter';

  const menuClass = `
    flex flex-col gap-3
    p-3
    text-blue-700 bg-white
    rounded-lg shadow-md
  `;
  const menuSectionTitleClass = `
    flex gap-2
    text-lg
    text-fuchsia-600
  `;
  const menuSectionClass = `
    grid grid-cols-[min-content_1fr] items-center gap-3
  `;

  function handleFromChange({ detail: from }) {
    searchFilter.setFrom(from);
  }

  function handleToChange({ detail: to }) {
    searchFilter.setTo(to);
  }
</script>

<div class={menuClass}>
  <h3 class={menuSectionTitleClass}>
    <CalendarIcon />
    <TextGradient>Zeitraum</TextGradient>
  </h3>
  <section class={menuSectionClass}>
    <label for="from-input">Von</label>
    <DateInput id="from-input" value={$searchFilter.from} on:change={handleFromChange} />
    <label for="to-input">Bis</label>
    <DateInput id="to-input" value={$searchFilter.to} on:change={handleToChange} />
  </section>
</div>
