<script lang="ts">
  import searchTextFilter from '$lib/stores/searchTextFilter';
  import Input from '$lib/components/ui/controls/Input.svelte';
  import classNames from 'classnames';
  import { defaultPadding } from '$lib/utils/styles';

  const filterClass = classNames([defaultPadding, 'w-full', 'bg-white', 'rounded-lg shadow-md']);

  function handleSearchChange({ detail: search }: { detail: string }) {
    searchTextFilter.setSearchTextFilter(search);
  }
</script>

<div class={filterClass}>
  <Input id="search-input" value={$searchTextFilter.textFilter} on:change={handleSearchChange} placeholder="Suche" />
</div>
