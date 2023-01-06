<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import styles, { type ColorScheme } from '$lib/stores/styles';

  $: if (browser) applyColorScheme($styles.colorScheme ?? 'system');

  onMount(() => {
    if (browser) {
      getPrefersDarkColorSchemeQuery().addEventListener('change', changeColorScheme);
    }
  });

  onDestroy(() => {
    if (browser) {
      getPrefersDarkColorSchemeQuery().removeEventListener('change', changeColorScheme);
    }
  });

  function applyColorScheme(colorScheme: ColorScheme, prefersDarkColorScheme?: boolean) {
    if (colorScheme === 'system') {
      if (prefersDarkColorScheme ?? getPrefersDarkColorSchemeQuery()?.matches) {
        setDarkClass();
      } else {
        setLightClass();
      }
    }
    if (colorScheme === 'light') {
      setLightClass();
    }
    if (colorScheme === 'dark') {
      setDarkClass();
    }
  }

  function changeColorScheme({ matches: prefersDarkColorScheme }: { matches: boolean }) {
    const colorScheme = $styles.colorScheme;
    if (colorScheme === 'system') {
      applyColorScheme(colorScheme, prefersDarkColorScheme);
    }
  }

  function getPrefersDarkColorSchemeQuery() {
    return window.matchMedia('(prefers-color-scheme: dark)');
  }

  function setLightClass() {
    document.documentElement.classList.remove('dark');
  }

  function setDarkClass() {
    document.documentElement.classList.add('dark');
  }
</script>
