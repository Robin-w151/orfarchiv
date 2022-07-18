<script lang="ts">
  import '../app.css';
  import classNames from 'classnames';
  import CogIcon from '../lib/components/ui/icons/outline/CogIcon.svelte';

  const wrapperClass = classNames(['flex flex-col gap-4', 'p-4', 'w-screen max-w-screen-md']);
  const headerClass = classNames([
    'flex justify-between items-center',
    'px-6 py-3',
    'text-3xl',
    'text-blue-900 bg-white',
    'rounded-lg shadow-md',
  ]);
</script>

<div class={wrapperClass}>
  <header class={headerClass}>
    <h1>
      <a href="/">ORF News Archiv</a>
    </h1>
    <div>
      <a href="/settings">
        <CogIcon />
      </a>
    </div>
  </header>
  <main>
    <slot />
  </main>
</div>

<style>
</style>
