<script lang="ts">
  import QuestionMarkCircleIcon from '$lib/components/ui/icons/outline/QuestionMarkCircleIcon.svelte';

  export let onClose: () => void;

  let clazz: string;
  export { clazz as class };

  function handleOpenSupportClick() {
    onClose();
  }
</script>

<a
  class={clazz}
  href="https://der.orf.at/kontakt/orf-online-angebote100.html"
  target="_blank"
  rel="noopener noreferrer"
  on:click={handleOpenSupportClick}
>
  <QuestionMarkCircleIcon />
  <span>Kundendienst</span>
</a>
