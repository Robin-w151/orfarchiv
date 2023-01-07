<script lang="ts">
  import Link from '$lib/components/ui/controls/Link.svelte';
  import QuestionMarkCircleIcon from '$lib/components/ui/icons/outline/QuestionMarkCircleIcon.svelte';

  export let onClose: () => void;

  let clazz: string;
  export { clazz as class };

  function handleOpenSupportClick() {
    onClose();
  }
</script>

<Link
  class={clazz}
  customStyle
  href="https://der.orf.at/kontakt/orf-online-angebote100.html"
  on:click={handleOpenSupportClick}
>
  <QuestionMarkCircleIcon />
  <span>Kundendienst</span>
</Link>
