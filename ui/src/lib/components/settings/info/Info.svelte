<script lang="ts">
  import Section from '$lib/components/ui/content/Section.svelte';
  import Link from '$lib/components/ui/controls/Link.svelte';
  import SectionList from '$lib/components/ui/content/SectionList.svelte';
  import SimpleItem from '$lib/components/ui/content/SimpleItem.svelte';

  const appVersion = import.meta.env.APP_VERSION;
  const sourceCodeUrl = 'https://github.com/Robin-w151/orfarchiv';
  const svelteKitUrl = 'https://kit.svelte.dev';
  const vercelUrl = 'https://vercel.com';
</script>

<Section class="grid-info" title="Info">
  <SectionList>
    <SimpleItem>Version {appVersion}</SimpleItem>
    <SimpleItem>Quellcode auf <Link href={sourceCodeUrl}>GitHub</Link></SimpleItem>
    <SimpleItem>Powered by <Link href={svelteKitUrl}>SvelteKit</Link></SimpleItem>
    <SimpleItem>Gehostet bei <Link href={vercelUrl}>Vercel</Link></SimpleItem>
  </SectionList>
</Section>
