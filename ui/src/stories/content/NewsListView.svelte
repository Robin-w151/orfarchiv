<script lang="ts">
  import NewsList from '$lib/components/news/NewsList.svelte';
  import type { NewsBucket } from '$lib/models/news';

  const newsBucket: NewsBucket = {
    name: 'Donnerstag, 06.04.2023',
    date: '2023-04-06',
    stories: [
      {
        id: 'news:3311767',
        title: 'Neues Konzept für Campus der Religionen in Wien',
        category: 'Religion',
        url: 'https://orf.at/stories/3311767/',
        timestamp: '2023-04-06T17:55:33.000Z',
        source: 'news',
      },
      {
        id: 'burgenland:3202024',
        title: 'Land stockt Ärztestipendien weiter auf',
        category: 'Chronik',
        url: 'https://burgenland.orf.at/stories/3202024/',
        timestamp: '2023-04-06T17:38:30.000Z',
        source: 'burgenland',
      },
      {
        id: 'kaernten:3202023',
        title: 'Mann mit Tochtertrick betrogen',
        category: 'Chronik',
        url: 'https://kaernten.orf.at/stories/3202023/',
        timestamp: '2023-04-06T17:33:43.000Z',
        source: 'kaernten',
      },
      {
        id: 'vorarlberg:3201986',
        title: 'Poolbar Generator für das Festivaldesign',
        category: 'Überblick: Lifestyle',
        url: 'https://vorarlberg.orf.at/stories/3201986/',
        timestamp: '2023-04-06T17:32:32.000Z',
        source: 'vorarlberg',
      },
      {
        id: 'news:3311766',
        title: 'WKO: Kopf für Abschaffung von CO2-Steuer',
        category: 'Umwelt',
        url: 'https://orf.at/stories/3311766/',
        timestamp: '2023-04-06T17:22:25.000Z',
        source: 'news',
      },
    ],
  };
</script>

<div class="w-full max-w-screen-lg">
  <NewsList storyBuckets={[newsBucket]} isLoading={false} />
</div>
