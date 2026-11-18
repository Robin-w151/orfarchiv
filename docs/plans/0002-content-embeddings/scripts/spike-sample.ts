import { hasJson, writeJson, withDb, type SampleStory } from './spike-lib.ts';

const PER_YEAR = 60;
const YEARS = [2022, 2023, 2024, 2025, 2026];

if (hasJson('sample.json') && !process.argv.includes('--resample')) {
  console.log('sample.json exists, pass --resample to draw a new one');
  process.exit(0);
}

const sample = await withDb(async (client) => {
  const news = client.db('orfarchiv').collection('news');
  const sources = (await news.distinct('source')).sort() as string[];
  const stories: SampleStory[] = [];

  for (const year of YEARS) {
    const range = { $gte: new Date(`${year}-01-01T00:00:00Z`), $lt: new Date(`${year + 1}-01-01T00:00:00Z`) };
    const base = Math.floor(PER_YEAR / sources.length);
    const extra = PER_YEAR - base * sources.length;
    const shuffled = [...sources].sort(() => Math.random() - 0.5);
    for (const [i, source] of shuffled.entries()) {
      const size = base + (i < extra ? 1 : 0);
      const docs = await news
        .aggregate<SampleStory>([
          { $match: { source, timestamp: range } },
          { $sample: { size } },
          { $project: { _id: 0, id: 1, title: 1, url: 1, source: 1, timestamp: 1 } },
        ])
        .toArray();
      stories.push(...docs.map((d) => ({ ...d, timestamp: new Date(d.timestamp).toISOString() })));
    }
  }
  return stories;
});

writeJson('sample.json', sample);
const counts: Record<string, number> = {};
for (const s of sample) counts[s.timestamp.slice(0, 4)] = (counts[s.timestamp.slice(0, 4)] ?? 0) + 1;
console.log(`sampled ${sample.length} stories`, counts);
