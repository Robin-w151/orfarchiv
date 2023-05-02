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
    <SimpleItem>
      <span>Version</span>
      <span>{appVersion}</span>
    </SimpleItem>
    <SimpleItem>
      <span>Quellcode auf</span>
      <Link href={sourceCodeUrl}>GitHub</Link>
    </SimpleItem>
    <SimpleItem>
      <span>Powered by</span>
      <Link href={svelteKitUrl}>SvelteKit</Link>
    </SimpleItem>
    <SimpleItem>
      <span>Gehostet bei</span>
      <Link href={vercelUrl}>Vercel</Link>
    </SimpleItem>
  </SectionList>
</Section>
