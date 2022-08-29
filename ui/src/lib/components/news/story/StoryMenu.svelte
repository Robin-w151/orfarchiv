<script lang="ts">
  import classNames from 'classnames';
  import ShareIcon from '$lib/components/ui/icons/outline/ShareIcon.svelte';
  import NewspaperIcon from '$lib/components/ui/icons/outline/NewspaperIcon.svelte';

  export let url: string;
  export let onClose: any;

  const menuClass = classNames(['flex flex-col gap-2', 'p-2', 'bg-white', 'rounded-lg shadow-md']);
  const menuItemClass = classNames([
    'flex gap-2',
    'p-2',
    'text-blue-800 hover:text-blue-600 hover:bg-blue-100',
    'rounded-lg cursor-pointer',
  ]);

  function handleOpenArticleClick() {
    onClose();
  }

  function handleShareArticleClick() {
    const data = { text: url };
    if (navigator.canShare?.(data) || navigator.share) {
      navigator.share(data).catch(console.log);
    }
    onClose();
  }
</script>

<div class={menuClass}>
  <a class={menuItemClass} href={url} target="_blank" rel="noopener" on:click={handleOpenArticleClick}>
    <NewspaperIcon />
    <span>Link zum Artikel</span>
  </a>
  <button class={menuItemClass} on:click={handleShareArticleClick}>
    <ShareIcon />
    <span>Teilen</span>
  </button>
</div>
