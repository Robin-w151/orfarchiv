<script lang="ts">
  import '../app.css';
  import classNames from 'classnames';

  const headerClass = classNames(['p-3', 'text-3xl', 'text-blue-900 bg-white', 'rounded-lg shadow-sm']);
</script>

<header class={headerClass}>
  <h1>ORF Archiv</h1>
</header>

<main>
  <slot />
</main>

<style>
</style>
