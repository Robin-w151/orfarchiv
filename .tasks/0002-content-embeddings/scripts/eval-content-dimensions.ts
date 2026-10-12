import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Effect } from '../../../shared/node_modules/effect/dist/index.js';
import { quantize } from '../../../shared/src/embedding/embedding.ts';
import { StoryContentService } from '../../../shared/src/storyContent/storyContent.ts';
import { EMBEDDING_ROOT, sleep, tokenize, truncateToTokens, withDb } from './spike-lib.ts';

const OUT = process.env.EVAL_OUT ?? '/tmp/orfarchiv-eval';
const SEED = 20261011;
const SAMPLE_SIZE = 2000;
const YEARS = [2022, 2023, 2024, 2025, 2026];
const FETCH_INTERVAL_MS = 100;
const USER_AGENT = 'orfarchiv-eval (+https://orfarchiv.news)';
const MAX_TOKENS = 1024;
const EMBED_BATCH = 8;
const FULL_DIMS = 768;
const DIMS = [256, 512, 768];
const BOOTSTRAP_RESAMPLES = 1000;
const CORPUS_STORIES = 437_000;
const HNSW_LINK_BYTES = 2 * 16 * 4;

const SEMANTIC_SEARCH_MIN_NOUN_LENGTH = 4;
const SEMANTIC_SEARCH_ACRONYM_MAX_LENGTH = 7;

type Story = { id: string; title: string; url: string; source: string; timestamp: string };
type FetchEntry = { id: string; status: number | null; ok: boolean; error?: string };
type ExtractEntry = { id: string; ok: boolean; reason?: string; chars?: number };
type Inputs = { id: string; a: string; b: string; aTokens: number; bTokens: number };
type Paraphrase = { id: string; lead: string; query: string };

mkdirSync(join(OUT, 'html'), { recursive: true });
mkdirSync(join(OUT, 'text'), { recursive: true });

const out = (...parts: string[]) => join(OUT, ...parts);
const fileId = (id: string) => id.replace(':', '_');
const readJson = <T>(name: string) => JSON.parse(readFileSync(out(name), 'utf8')) as T;
const writeJson = (name: string, data: unknown) => writeFileSync(out(name), JSON.stringify(data, null, 2));
const hasJson = (name: string) => existsSync(out(name));
const argValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

function hashSeed(text: string) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function normalizeQuery(query: string): string {
  const trimmed = query.trim().replace(/\s+/g, ' ');
  const hasUpper = /\p{Lu}/u.test(trimmed);
  const hasLower = /\p{Ll}/u.test(trimmed);
  if (hasUpper && hasLower) {
    return trimmed;
  }
  if (!hasUpper) {
    return trimmed
      .split(' ')
      .map((token, index) =>
        index === 0 || token.length >= SEMANTIC_SEARCH_MIN_NOUN_LENGTH ? capitalize(token) : token,
      )
      .join(' ');
  }

  const perToken = trimmed
    .split(' ')
    .map((token) => (token.length <= SEMANTIC_SEARCH_ACRONYM_MAX_LENGTH ? token : token.toLowerCase()))
    .join(' ');
  return capitalize(perToken);
}

function capitalize(text: string): string {
  return text.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}

function toQueryInput(query: string): string {
  return `task: search result | query: ${query}`;
}

function toContentDocumentInput(title: string, body: string) {
  return `title: ${title} | text: ${body}`;
}

function toBodyOnlyInput(body: string) {
  return `title: none | text: ${body}`;
}

async function postEmbeddings(inputs: string[]) {
  const response = await fetch(`${EMBEDDING_ROOT}/v1/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: inputs }),
  });
  const body = await response.text();
  if (!response.ok) return { ok: false as const, status: response.status, body };
  const json = JSON.parse(body) as { data: { index: number; embedding: number[] }[] };
  return { ok: true as const, vectors: json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding) };
}

async function probe() {
  const limit = Number(argValue('--probe-tokens') ?? MAX_TOKENS);
  const filler =
    'Die Bundesregierung hat am Mittwoch in Wien ein neues Gesetz zur Förderung erneuerbarer Energie beschlossen. '.repeat(
      Math.ceil(limit / 10),
    );
  const { text } = await truncateToTokens(filler, limit);
  const tokens = (await tokenize(text)).length;
  const result = await postEmbeddings([text]);
  if (!result.ok) {
    if (result.status === 500 && result.body.includes('too large to process')) {
      console.error(
        `Probe failed: the embedding server rejected a ${tokens}-token input: ${result.body}\n` +
          `Start orfarchiv-embeddings with '--batch-size 2048 --ubatch-size 2048' (story 00); the default --ubatch-size 512 rejects inputs over 512 tokens.`,
      );
    } else {
      console.error(`Probe failed with HTTP ${result.status}: ${result.body}`);
    }
    process.exit(1);
  }
  console.log(`probe ok: ${tokens}-token input embedded (${result.vectors[0].length} dims)`);
}

async function sample() {
  if (hasJson('sample.json')) return readJson<Story[]>('sample.json');

  const stories = await withDb(async (client) => {
    const news = client.db('orfarchiv').collection('news');
    const sources = ((await news.distinct('source')) as string[]).sort();
    const buckets = YEARS.flatMap((year) => sources.map((source) => ({ year, source })));
    const base = Math.floor(SAMPLE_SIZE / buckets.length);
    const extra = new Set(
      shuffle(
        buckets.map((_, i) => i),
        mulberry32(SEED),
      ).slice(0, SAMPLE_SIZE - base * buckets.length),
    );

    const picked: string[] = [];
    const shortfalls: string[] = [];
    for (const [i, { year, source }] of buckets.entries()) {
      const size = base + (extra.has(i) ? 1 : 0);
      const timestamp = { $gte: new Date(`${year}-01-01T00:00:00Z`), $lt: new Date(`${year + 1}-01-01T00:00:00Z`) };
      const ids = (await news.find({ source, timestamp }, { projection: { _id: 0, id: 1 } }).toArray())
        .map((d) => d.id as string)
        .sort();
      const chosen = shuffle(ids, mulberry32(hashSeed(`${SEED}:${year}:${source}`))).slice(0, size);
      if (chosen.length < size) shortfalls.push(`${year}/${source}: ${chosen.length} of ${size}`);
      picked.push(...chosen);
    }
    if (shortfalls.length) console.log('bucket shortfalls', shortfalls);

    const docs = await news
      .find({ id: { $in: picked } }, { projection: { _id: 0, id: 1, title: 1, url: 1, source: 1, timestamp: 1 } })
      .toArray();
    const byId = new Map(docs.map((d) => [d.id as string, d]));
    return picked.map((id) => {
      const d = byId.get(id)!;
      return { id, title: d.title, url: d.url, source: d.source, timestamp: new Date(d.timestamp).toISOString() };
    });
  });

  writeJson('sample.json', stories);
  return stories;
}

async function fetchPages(stories: Story[]) {
  const cached = hasJson('fetch.json') ? readJson<FetchEntry[]>('fetch.json') : [];
  const known = new Map(cached.map((e) => [e.id, e]));
  const missing = stories.filter((s) => !known.has(s.id));
  if (missing.length) {
    console.log(`fetching ${missing.length} pages at ${1000 / FETCH_INTERVAL_MS}/s`);
    const started = Date.now();
    const pending: Promise<FetchEntry>[] = [];
    for (const story of missing) {
      pending.push(fetchPage(story));
      await sleep(FETCH_INTERVAL_MS);
    }
    for (const entry of await Promise.all(pending)) known.set(entry.id, entry);
    console.log(`fetched in ${((Date.now() - started) / 1000).toFixed(0)} s`);
    writeJson(
      'fetch.json',
      stories.map((s) => known.get(s.id)),
    );
  }
  return known;
}

async function fetchPage(story: Story): Promise<FetchEntry> {
  try {
    const response = await fetch(story.url, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    const isHtml = (response.headers.get('content-type') ?? '').includes('html');
    const body = response.ok && isHtml ? await response.text() : '';
    if (!body) await response.body?.cancel();
    else writeFileSync(out('html', `${fileId(story.id)}.html`), body);
    return { id: story.id, status: response.status, ok: body.length > 0 };
  } catch (error) {
    return { id: story.id, status: null, ok: false, error: String(error) };
  }
}

async function extract(stories: Story[], fetched: Map<string, FetchEntry>) {
  if (hasJson('extract.json')) return readJson<ExtractEntry[]>('extract.json');

  const program = Effect.gen(function* () {
    const storyContent = yield* StoryContentService;
    const entries: ExtractEntry[] = [];
    for (const story of stories.filter((s) => fetched.get(s.id)?.ok)) {
      const html = readFileSync(out('html', `${fileId(story.id)}.html`), 'utf8');
      const entry = yield* storyContent.extractArticleText(html, story.url).pipe(
        Effect.map((text) => {
          writeFileSync(out('text', `${fileId(story.id)}.txt`), text);
          return { id: story.id, ok: true, chars: text.length };
        }),
        Effect.catchTag('StoryContentError', (error) => Effect.succeed({ id: story.id, ok: false, reason: error.reason })),
      );
      entries.push(entry);
    }
    return entries;
  });

  const entries = await Effect.runPromise(program.pipe(Effect.provide(StoryContentService.layer)));
  writeJson('extract.json', entries);
  return entries;
}

const readText = (id: string) => readFileSync(out('text', `${fileId(id)}.txt`), 'utf8');

async function buildInputs(stories: Story[]) {
  if (hasJson('inputs.json')) return readJson<Inputs[]>('inputs.json');
  const inputs: Inputs[] = [];
  for (const story of stories) {
    const body = readText(story.id);
    const a = await truncateToTokens(toContentDocumentInput(story.title, body), MAX_TOKENS);
    const b = await truncateToTokens(toBodyOnlyInput(body), MAX_TOKENS);
    inputs.push({ id: story.id, a: a.text, b: b.text, aTokens: a.tokens, bTokens: b.tokens });
  }
  writeJson('inputs.json', inputs);
  return inputs;
}

const stripPunctuation = (token: string) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

function leadParagraph(body: string) {
  return body.split('\n\n').find((paragraph) => paragraph.split(/\s+/).length >= 8);
}

function nounCandidates(text: string, titleWords: Set<string>) {
  const raw = text.split(/\s+/).filter(Boolean);
  const candidates: { word: string; position: number }[] = [];
  const seen = new Set<string>();
  for (const [position, token] of raw.entries()) {
    const word = stripPunctuation(token);
    const sentenceInitial = position === 0 || /[.!?:]["“”»«]?$/u.test(raw[position - 1]);
    if (sentenceInitial || word.length < 4 || !/^\p{Lu}/u.test(word)) continue;
    const key = word.toLowerCase();
    if (titleWords.has(key) || seen.has(key)) continue;
    seen.add(key);
    candidates.push({ word, position });
  }
  return candidates;
}

function paraphraseQuery(story: Story): Paraphrase | undefined {
  const lead = leadParagraph(readText(story.id));
  if (!lead) return undefined;
  const titleWords = new Set(story.title.split(/\s+/).map((t) => stripPunctuation(t).toLowerCase()));
  const firstSentence = lead.split(/(?<=[.!?])\s+(?=[\p{Lu}„"])/u)[0];
  let candidates = nounCandidates(firstSentence, titleWords);
  if (candidates.length < 2) candidates = nounCandidates(lead, titleWords);
  if (candidates.length < 2) return undefined;
  const chosen = [...candidates]
    .sort((x, y) => y.word.length - x.word.length || x.position - y.position)
    .slice(0, 3)
    .sort((x, y) => x.position - y.position);
  return { id: story.id, lead: firstSentence, query: normalizeQuery(chosen.map((c) => c.word).join(' ')) };
}

async function embedAll(name: string, ids: string[], texts: string[]) {
  const vectorsFile = out(`vectors-${name}.f32`);
  const idsFile = `vectors-${name}.json`;
  if (existsSync(vectorsFile) && hasJson(idsFile) && JSON.stringify(readJson<string[]>(idsFile)) === JSON.stringify(ids)) {
    const buffer = readFileSync(vectorsFile);
    return new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  }

  const vectors = new Float32Array(ids.length * FULL_DIMS);
  const started = performance.now();
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const result = await postEmbeddings(texts.slice(i, i + EMBED_BATCH));
    if (!result.ok) throw new Error(`embeddings ${result.status}: ${result.body}`);
    for (const [j, vector] of result.vectors.entries()) vectors.set(vector.slice(0, FULL_DIMS), (i + j) * FULL_DIMS);
    if ((i / EMBED_BATCH) % 25 === 0) process.stdout.write(`\r${name}: ${i + EMBED_BATCH}/${texts.length}`);
  }
  const seconds = (performance.now() - started) / 1000;
  console.log(`\r${name}: ${texts.length} embedded in ${seconds.toFixed(0)} s`);
  writeFileSync(vectorsFile, Buffer.from(vectors.buffer));
  writeJson(idsFile, ids);
  const timings = hasJson('timings.json') ? readJson<Record<string, unknown>>('timings.json') : {};
  writeJson('timings.json', { ...timings, [name]: { docs: texts.length, seconds, msPerDoc: (seconds * 1000) / texts.length } });
  return vectors;
}

function quantizeAll(vectors: Float32Array, count: number, dims: number) {
  const matrix = new Int8Array(count * dims);
  const norms = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const values = Array.from(vectors.subarray(i * FULL_DIMS, i * FULL_DIMS + dims));
    const quantized = quantize(values).toInt8Array();
    matrix.set(quantized, i * dims);
    let sum = 0;
    for (const v of quantized) sum += v * v;
    norms[i] = Math.sqrt(sum);
  }
  return { matrix, norms };
}

function knownItemRanks(queries: Float32Array, targets: number[], docs: Float32Array, docCount: number, dims: number) {
  const q = quantizeAll(queries, targets.length, dims);
  const d = quantizeAll(docs, docCount, dims);
  const scores = new Float64Array(docCount);
  return targets.map((target, qi) => {
    const qOffset = qi * dims;
    for (let di = 0; di < docCount; di++) {
      const dOffset = di * dims;
      let dot = 0;
      for (let k = 0; k < dims; k++) dot += q.matrix[qOffset + k] * d.matrix[dOffset + k];
      scores[di] = dot / (q.norms[qi] * d.norms[di] || 1);
    }
    const own = scores[target];
    let rank = 1;
    for (let di = 0; di < docCount; di++) if (di !== target && scores[di] >= own) rank++;
    return rank;
  });
}

type Metric = 'recall@1' | 'recall@10' | 'MRR';
const METRICS: Metric[] = ['recall@1', 'recall@10', 'MRR'];
const perQuery = (metric: Metric, rank: number) =>
  metric === 'recall@1' ? +(rank === 1) : metric === 'recall@10' ? +(rank <= 10) : 1 / rank;

function quantile(sorted: number[], p: number) {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * (index - lower);
}

function evaluate(name: string, ranksByDim: Map<number, number[]>) {
  const n = ranksByDim.get(FULL_DIMS)!.length;
  const values = new Map(
    DIMS.flatMap((dim) => METRICS.map((m) => [`${dim}:${m}`, ranksByDim.get(dim)!.map((r) => perQuery(m, r))])),
  );
  const mean = (xs: number[], idx?: Uint32Array) => {
    let sum = 0;
    if (idx) for (const i of idx) sum += xs[i];
    else for (const x of xs) sum += x;
    return sum / (idx?.length ?? xs.length);
  };

  const random = mulberry32(hashSeed(`${SEED}:bootstrap:${name}`));
  const samples = new Map<string, number[]>();
  const push = (key: string, value: number) => {
    if (!samples.has(key)) samples.set(key, []);
    samples.get(key)!.push(value);
  };
  const indices = new Uint32Array(n);
  for (let r = 0; r < BOOTSTRAP_RESAMPLES; r++) {
    for (let i = 0; i < n; i++) indices[i] = Math.floor(random() * n);
    for (const m of METRICS) {
      const full = mean(values.get(`${FULL_DIMS}:${m}`)!, indices);
      for (const dim of DIMS) {
        const value = mean(values.get(`${dim}:${m}`)!, indices);
        push(`${dim}:${m}`, value);
        push(`${dim}:${m}:diff`, value - full);
      }
    }
  }
  const ci = (key: string) => {
    const sorted = samples.get(key)!.sort((a, b) => a - b);
    return [quantile(sorted, 0.025), quantile(sorted, 0.975)] as const;
  };

  return {
    queries: n,
    dims: DIMS.map((dim) => ({
      dim,
      ...Object.fromEntries(
        METRICS.map((m) => [
          m,
          { value: mean(values.get(`${dim}:${m}`)!), ci: ci(`${dim}:${m}`), diffTo768Ci: ci(`${dim}:${m}:diff`) },
        ]),
      ),
    })) as ({ dim: number } & Record<Metric, { value: number; ci: readonly [number, number]; diffTo768Ci: readonly [number, number] }>)[],
  };
}

function recommend(paraphrase: ReturnType<typeof evaluate>) {
  const full = paraphrase.dims.find((d) => d.dim === FULL_DIMS)!['recall@10'];
  for (const entry of paraphrase.dims.filter((d) => d.dim < FULL_DIMS)) {
    const r10 = entry['recall@10'];
    const withinOnePoint = full.value - r10.value <= 0.01;
    const overlaps = r10.ci[1] >= full.ci[0] && full.ci[1] >= r10.ci[0];
    if (withinOnePoint || overlaps) return { dim: entry.dim, withinOnePoint, overlaps };
  }
  return { dim: FULL_DIMS, withinOnePoint: true, overlaps: true };
}

const pct = (x: number) => (x * 100).toFixed(1);
const ciText = ([lo, hi]: readonly [number, number]) => `${pct(lo)}–${pct(hi)}`;
const mrrText = (x: number) => x.toFixed(3);
const mrrCi = ([lo, hi]: readonly [number, number]) => `${mrrText(lo)}–${mrrText(hi)}`;

function metricsTable(result: ReturnType<typeof evaluate>) {
  const rows = result.dims.map(
    (d) =>
      `| ${d.dim} | ${pct(d['recall@1'].value)} (${ciText(d['recall@1'].ci)}) | ${pct(d['recall@10'].value)} (${ciText(d['recall@10'].ci)}) | ${mrrText(d.MRR.value)} (${mrrCi(d.MRR.ci)}) | ${d.dim === FULL_DIMS ? '–' : `${ciText(d['recall@10'].diffTo768Ci)}`} |`,
  );
  return [
    '| Dims | recall@1 % (95 % CI) | recall@10 % (95 % CI) | MRR (95 % CI) | Δ recall@10 vs 768, pp (95 % CI) |',
    '|------|------|------|------|------|',
    ...rows,
  ].join('\n');
}

await probe();

const stories = await sample();
const fetched = await fetchPages(stories);
const extracted = await extract(stories, fetched);
const okIds = new Set(extracted.filter((e) => e.ok).map((e) => e.id));
const kept = stories.filter((s) => okIds.has(s.id));

const fetchFailures: Record<string, number> = {};
for (const s of stories) {
  const entry = fetched.get(s.id)!;
  if (!entry.ok) {
    const key = entry.status === null ? 'network error' : entry.status === 200 ? 'non-HTML 200' : `HTTP ${entry.status}`;
    fetchFailures[key] = (fetchFailures[key] ?? 0) + 1;
  }
}
const extractFailures: Record<string, number> = {};
for (const e of extracted.filter((e) => !e.ok)) extractFailures[e.reason!] = (extractFailures[e.reason!] ?? 0) + 1;

const inputs = await buildInputs(kept);
const paraphrases = kept.map(paraphraseQuery);
const paraphraseStories = kept.map((s, i) => ({ index: i, paraphrase: paraphrases[i] })).filter((p) => p.paraphrase);
writeJson(
  'paraphrases.json',
  paraphraseStories.map((p) => p.paraphrase),
);

const keptIds = kept.map((s) => s.id);
const docA = await embedAll(
  'docA',
  keptIds,
  inputs.map((i) => i.a),
);
const docB = await embedAll(
  'docB',
  keptIds,
  inputs.map((i) => i.b),
);
const titleQueries = await embedAll(
  'queryTitle',
  keptIds,
  kept.map((s) => toQueryInput(normalizeQuery(s.title))),
);
const paraphraseQueries = await embedAll(
  'queryParaphrase',
  paraphraseStories.map((p) => p.paraphrase!.id),
  paraphraseStories.map((p) => toQueryInput(p.paraphrase!.query)),
);

const titleRanks = new Map<number, number[]>();
const paraphraseRanks = new Map<number, number[]>();
for (const dim of DIMS) {
  titleRanks.set(
    dim,
    knownItemRanks(
      titleQueries,
      kept.map((_, i) => i),
      docB,
      kept.length,
      dim,
    ),
  );
  paraphraseRanks.set(
    dim,
    knownItemRanks(
      paraphraseQueries,
      paraphraseStories.map((p) => p.index),
      docA,
      kept.length,
      dim,
    ),
  );
}

const titleResult = evaluate('title', titleRanks);
const paraphraseResult = evaluate('paraphrase', paraphraseRanks);
const recommendation = recommend(paraphraseResult);
const timings = readJson<Record<string, { docs: number; seconds: number; msPerDoc: number }>>('timings.json');

const cost = DIMS.map((dim) => {
  const vectorsMb = (CORPUS_STORIES * dim) / 1e6;
  const graphMb = (CORPUS_STORIES * HNSW_LINK_BYTES) / 1e6;
  return { dim, vectorsMb, graphMb, totalMb: vectorsMb + graphMb };
});

const results = {
  seed: SEED,
  sampled: stories.length,
  fetched: [...fetched.values()].filter((e) => e.ok).length,
  fetchFailures,
  extractFailures,
  kept: kept.length,
  paraphraseQueries: paraphraseStories.length,
  paraphraseExcluded: kept.length - paraphraseStories.length,
  tokens: {
    aTruncated: inputs.filter((i) => i.aTokens >= MAX_TOKENS).length,
    bTruncated: inputs.filter((i) => i.bTokens >= MAX_TOKENS).length,
  },
  embeddingMsPerDoc: timings.docA.msPerDoc,
  titleAsQuery: titleResult,
  paraphrase: paraphraseResult,
  cost,
  recommendation,
};
writeJson('results.json', results);

const markdown = [
  `Sample: ${results.sampled} stories (seed ${SEED}), ${results.fetched} fetched, ${results.kept} extracted and evaluated.`,
  `Fetch failures: ${JSON.stringify(fetchFailures)}. Extraction failures: ${JSON.stringify(extractFailures)}.`,
  `Inputs truncated at ${MAX_TOKENS} tokens: ${results.tokens.aTruncated} (A), ${results.tokens.bTruncated} (B).`,
  '',
  `**Title as query, format (B) body-only** — ${titleResult.queries} queries against ${kept.length} docs`,
  '',
  metricsTable(titleResult),
  '',
  `**Paraphrase queries, format (A) production** — ${paraphraseResult.queries} queries against ${kept.length} docs (${results.paraphraseExcluded} stories without enough lead nouns excluded)`,
  '',
  metricsTable(paraphraseResult),
  '',
  `**Cost** for ${CORPUS_STORIES.toLocaleString('en')} stories (int8), HNSW links ≈ ${HNSW_LINK_BYTES} B/vector (M = 16)`,
  '',
  '| Dims | Vectors MB | HNSW links MB | Total MB |',
  '|------|-----------|---------------|----------|',
  ...cost.map((c) => `| ${c.dim} | ${c.vectorsMb.toFixed(0)} | ${c.graphMb.toFixed(0)} | ${c.totalMb.toFixed(0)} |`),
  '',
  `Embedding time (format A, batch ${EMBED_BATCH}): ${timings.docA.msPerDoc.toFixed(0)} ms/doc, independent of the stored dimension.`,
  '',
  `**Recommendation: ${recommendation.dim}** (within 1 point of 768: ${recommendation.withinOnePoint}, CI overlaps 768: ${recommendation.overlaps})`,
].join('\n');
writeFileSync(out('results.md'), markdown);
console.log(`\n${markdown}`);
