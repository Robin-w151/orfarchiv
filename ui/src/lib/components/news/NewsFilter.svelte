<script lang="ts">
  import news from '$lib/stores/news';
  import Input from '../ui/controls/Input.svelte';
  import classNames from 'classnames';

  const filterClass = classNames(['px-3 sm:px-6 py-3', 'w-full', 'bg-white', 'rounded-lg shadow-md']);

  function handleSearchChange({ detail: search }: { detail: string }) {
    news.setSearch(search);
  }
</script>

<div class={filterClass}>
  <Input id="search-input" value={$news.search} on:change={handleSearchChange} placeholder="Suche" />
</div>
