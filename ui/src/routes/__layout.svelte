<script lang="ts">
  import '../app.css';
  import classNames from 'classnames';

  const wrapperClass = classNames(['flex flex-col gap-4', 'p-4', 'w-screen max-w-screen-md']);
  const headerClass = classNames(['p-3', 'text-3xl', 'text-blue-900 bg-white', 'rounded-lg shadow-md']);
</script>

<div class={wrapperClass}>
  <header class={headerClass}>
    <h1>ORF News Archiv</h1>
  </header>
  <main>
    <slot />
  </main>
</div>

<style>
</style>
