import { mkdirSync, writeFileSync } from 'node:fs';
import { outPath, readJson, sleep, table, USER_AGENT, writeJson, type SampleStory } from './spike-lib.ts';

const INTERVAL_MS = 100;
const MAX_HOPS = 10;

export type FetchResult = {
  id: string;
  source: string;
  year: string;
  url: string;
  finalUrl: string;
  status: number | null;
  redirects: { status: number; location: string }[];
  ok: boolean;
  bytes: number;
  ms: number;
  error?: string;
};

mkdirSync(outPath('html'), { recursive: true });
const sample = readJson<SampleStory[]>('sample.json');

async function fetchStory(story: SampleStory): Promise<FetchResult> {
  const started = Date.now();
  const redirects: FetchResult['redirects'] = [];
  let url = story.url;
  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const response = await fetch(url, {
        redirect: 'manual',
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel();
        url = new URL(location, url).toString();
        redirects.push({ status: response.status, location: url });
        continue;
      }
      const isHtml = (response.headers.get('content-type') ?? '').includes('html');
      const body = response.ok && isHtml ? await response.text() : '';
      if (body) writeFileSync(outPath('html', `${story.id.replace(':', '_')}.html`), body);
      else await response.body?.cancel();
      return {
        id: story.id,
        source: story.source,
        year: story.timestamp.slice(0, 4),
        url: story.url,
        finalUrl: url,
        status: response.status,
        redirects,
        ok: response.ok && body.length > 0,
        bytes: body.length,
        ms: Date.now() - started,
      };
    }
    throw new Error('too many redirects');
  } catch (error) {
    return {
      id: story.id,
      source: story.source,
      year: story.timestamp.slice(0, 4),
      url: story.url,
      finalUrl: url,
      status: null,
      redirects,
      ok: false,
      bytes: 0,
      ms: Date.now() - started,
      error: String(error),
    };
  }
}

const started = Date.now();
const pending: Promise<FetchResult>[] = [];
for (const story of sample) {
  pending.push(fetchStory(story));
  await sleep(INTERVAL_MS);
}
const results = await Promise.all(pending);
console.log(`fetched ${results.length} pages in ${((Date.now() - started) / 1000).toFixed(1)} s`);
writeJson('fetch.json', results);

function rate(group: (r: FetchResult) => string) {
  const map = new Map<string, { total: number; ok: number; redirected: number }>();
  for (const r of results) {
    const entry = map.get(group(r)) ?? { total: 0, ok: 0, redirected: 0 };
    entry.total++;
    if (r.ok) entry.ok++;
    if (r.redirects.length) entry.redirected++;
    map.set(group(r), entry);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, ...v, hitRate: `${((v.ok / v.total) * 100).toFixed(0)}%` }));
}

table(rate((r) => r.year));
table(rate((r) => r.source));
table(rate(() => 'all'));

const statuses: Record<string, number> = {};
for (const r of results) statuses[String(r.status ?? r.error)] = (statuses[String(r.status ?? r.error)] ?? 0) + 1;
console.log('final status', statuses);

const hostChanges: Record<string, number> = {};
for (const r of results.filter((r) => r.redirects.length)) {
  const key = `${new URL(r.url).host} -> ${new URL(r.finalUrl).host} (${r.redirects.map((x) => x.status).join(',')})`;
  hostChanges[key] = (hostChanges[key] ?? 0) + 1;
}
console.log('redirects', hostChanges);
for (const r of results.filter((r) => !r.ok)) console.log('miss', r.id, r.status, r.url, '->', r.finalUrl, r.error ?? '');
