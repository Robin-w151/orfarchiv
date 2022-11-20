<script lang="ts">
  import Content from '$lib/components/ui/content/Content.svelte';
  import { defaultGap } from '$lib/utils/styles';
  import General from './general/General.svelte';
  import Sources from './sources/Sources.svelte';
  import Info from './info/Info.svelte';
  import Appearance from '$lib/components/settings/appearance/Appearance.svelte';
  import Developer from './developer/Developer.svelte';
  import { PUBLIC_APP_MODE } from '$env/static/public';

  const gridClass = `
    grid grid-cols-auto sm:grid-cols-[1fr_1fr] ${defaultGap}
    w-full
  `;
  const column1Class = `
    flex flex-col items-center ${defaultGap}
  `;
</script>

<Content>
  <div class={gridClass}>
    <div class={column1Class}>
      <General />
      <Appearance />
      <Info />
      {#if PUBLIC_APP_MODE === 'dev'}
        <Developer />
      {/if}
    </div>
    <div>
      <Sources />
    </div>
  </div>
</Content>
