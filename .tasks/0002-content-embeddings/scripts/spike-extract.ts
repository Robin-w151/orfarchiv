import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import { outPath, percentile, readJson, table, writeJson, type SampleStory } from './spike-lib.ts';
import type { FetchResult } from './spike-fetch.ts';

const CLASSES_TO_PRESERVE = ['fact', 'image-container', 'image-credit-tag', 'keyword', 'slideshow'];
const READ_MORE_REGEXPS = [/mehr\s+(\w+\s+)*in/i, /lesen\s+(\w+\s+)*mehr/i];
const ORF_STORY_REGEXP = /^https:\/\/.*orf\.at\/(.+\/)?stories\/\d+/i;

export const EXTRA_SELECTORS = [
  '.story-meta-dates',
  '.storyMeta',
  'p.credit',
  'p.toplink',
  'p.backlink',
  '.sr-only',
  'div.remote',
];

const useExtra = process.argv.includes('--extra');
const label = useExtra ? 'extra' : 'baseline';
const virtualConsole = new VirtualConsole();

export type ExtractResult = {
  id: string;
  source: string;
  year: string;
  title: string;
  empty: boolean;
  teaser: boolean;
  readMoreUrl: string | null;
  chars: number;
  words: number;
  paragraphs: number;
  junk: string[];
};

const JUNK_PATTERNS: Record<string, RegExp> = {
  mehrZumThema: /Mehr zum Thema/i,
  teilen: /\b(Teilen|Facebook|Twitter|WhatsApp|Bluesky)\b/,
  link: /\bLinks?:/,
  credit: /(Foto|Grafik|Bild)\s*:|©|\bAPA\/|\bORF\.at\/|picturedesk/i,
  seitenanfang: /Seitenanfang|Zum Seitenanfang/i,
  cookie: /Cookie|Datenschutz/i,
  printWarning: /Dieser Artikel ist nicht mehr aktuell|Druckversion/i,
  chartLabel: /Grafik zu „/,
  audioVideo: /Audio|Video abspielen|Livestream/i,
};

function createDom(html: string, url: string) {
  return new JSDOM(html, { url, virtualConsole }).window.document;
}

function findReadMoreUrl(document: Document): string | null {
  const paragraphs = [...document.querySelectorAll('p')];
  if (paragraphs.length > 4) return null;
  return (
    paragraphs
      .filter((p) => {
        const text = p.textContent;
        if (!text || !READ_MORE_REGEXPS.some((r) => r.test(text))) return false;
        return ORF_STORY_REGEXP.test(p.querySelector('a')?.href ?? '');
      })
      .map((p) => p.querySelector('a')?.href ?? '')[0] ?? null
  );
}

export function extractText(html: string, url: string, extraSelectors: string[] = []) {
  const original = createDom(html, url);
  const readMoreUrl = findReadMoreUrl(original);

  const document = createDom(html, url);
  for (const selector of ['.print-warning', 'p.caption.stripe-credits', 'section.stripe', '#more-to-read', 'div.embed.migsys', ...extraSelectors]) {
    for (const element of document.querySelectorAll(selector)) element.remove();
  }
  const parsed = new Readability(document, { classesToPreserve: CLASSES_TO_PRESERVE }).parse();
  if (!parsed?.content) return { text: '', html: '', readMoreUrl };

  const optimized = createDom(parsed.content, url);
  for (const nav of optimized.querySelectorAll('nav')) nav.remove();
  for (const block of optimized.querySelectorAll('p, h1, h2, h3, h4, li, figcaption, div.fact')) block.append(' \n');
  const text = (optimized.body.textContent ?? '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return { text, html: optimized.body.innerHTML, readMoreUrl, paragraphs: optimized.querySelectorAll('p').length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = new Map(readJson<SampleStory[]>('sample.json').map((s) => [s.id, s]));
  const fetched = readJson<FetchResult[]>('fetch.json').filter((r) => r.ok);
  mkdirSync(outPath('text', label), { recursive: true });

  const results: ExtractResult[] = [];
  for (const page of fetched) {
    const file = outPath('html', `${page.id.replace(':', '_')}.html`);
    if (!existsSync(file)) continue;
    const story = sample.get(page.id)!;
    const { text, readMoreUrl, paragraphs = 0 } = extractText(readFileSync(file, 'utf8'), page.finalUrl, useExtra ? EXTRA_SELECTORS : []);
    writeFileSync(outPath('text', label, `${page.id.replace(':', '_')}.txt`), `${story.title}\n${page.finalUrl}\n\n${text}\n`);
    results.push({
      id: page.id,
      source: page.source,
      year: page.year,
      title: story.title,
      empty: text.length === 0,
      teaser: readMoreUrl !== null,
      readMoreUrl,
      chars: text.length,
      words: text.split(/\s+/).filter(Boolean).length,
      paragraphs,
      junk: Object.entries(JUNK_PATTERNS)
        .filter(([, r]) => r.test(text))
        .map(([k]) => k),
    });
  }
  writeJson(`extract-${label}.json`, results);

  const byYear = new Map<string, ExtractResult[]>();
  for (const r of results) byYear.set(r.year, [...(byYear.get(r.year) ?? []), r]);
  byYear.set('all', results);
  table(
    [...byYear.entries()].sort().map(([year, rs]) => {
      const chars = rs.filter((r) => !r.empty).map((r) => r.chars);
      return {
        year,
        pages: rs.length,
        empty: rs.filter((r) => r.empty).length,
        teaser: rs.filter((r) => r.teaser).length,
        p10: percentile(chars, 10),
        p50: percentile(chars, 50),
        p90: percentile(chars, 90),
        under300: rs.filter((r) => r.chars < 300).length,
      };
    }),
  );

  const junkRows: Record<string, unknown>[] = [];
  for (const key of Object.keys(JUNK_PATTERNS)) {
    const row: Record<string, unknown> = { pattern: key };
    for (const [year, rs] of [...byYear.entries()].sort()) row[year] = rs.filter((r) => r.junk.includes(key)).length;
    junkRows.push(row);
  }
  table(junkRows);

  const teasers = results.filter((r) => r.teaser);
  table(teasers.map((r) => ({ id: r.id, chars: r.chars, readMore: r.readMoreUrl })));
  table(results.filter((r) => r.chars < 300).map((r) => ({ id: r.id, chars: r.chars, teaser: r.teaser, title: r.title.slice(0, 50) })));
}
