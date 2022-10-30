<script lang="ts">
  import Content from '$lib/components/ui/content/Content.svelte';
  import Button from '$lib/components/ui/controls/Button.svelte';
  import { goto } from '$app/navigation';
  import Actions from '$lib/components/ui/content/Actions.svelte';

  import { defaultGap } from '$lib/utils/styles';
  import General from './general/General.svelte';
  import Sources from './sources/Sources.svelte';
  import Info from './info/Info.svelte';

  const gridClass = `
    grid grid-cols-auto sm:grid-cols-[1fr_1fr] ${defaultGap}
    w-full
  `;
  const generalClass = `
    sm:col-span-2
  `;
  const infoClass = `
    flex flex-col items-center ${defaultGap}
  `;

  function handleReadyButtonClick() {
    goto('/');
  }
</script>

<Content>
  <div class={gridClass}>
    <div class={generalClass}>
      <General />
    </div>
    <div>
      <Sources />
    </div>
    <div class={infoClass}>
      <Info />
      <Actions>
        <Button on:click={handleReadyButtonClick}>Fertig</Button>
      </Actions>
    </div>
  </div>
</Content>
