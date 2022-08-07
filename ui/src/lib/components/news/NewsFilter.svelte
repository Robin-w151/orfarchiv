<script lang="ts">
  import news from '$lib/stores/news';
  import Input from '$lib/components/ui/controls/Input.svelte';
  import classNames from 'classnames';
  import { defaultPadding } from '$lib/utils/styles';

  const filterClass = classNames([defaultPadding, 'w-full', 'bg-white', 'rounded-lg shadow-md']);

  function handleSearchChange({ detail: search }: { detail: string }) {
    news.setSearch(search);
  }
</script>

<div class={filterClass}>
  <Input id="search-input" value={$news.search} on:change={handleSearchChange} placeholder="Suche" />
</div>
