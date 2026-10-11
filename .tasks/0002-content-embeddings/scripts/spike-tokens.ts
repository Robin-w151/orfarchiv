import { readFileSync } from 'node:fs';
import { embed, outPath, percentile, readJson, table, tokenize, toContentInput, truncateToTokens, writeJson } from './spike-lib.ts';
import type { ExtractResult } from './spike-extract.ts';

const LIMITS = [512, 1024];
const BATCHES = [1, 8, 32];
const DOCS_PER_RUN = 64;
const ARCHIVE = 443_279;

const extracted = readJson<ExtractResult[]>('extract-extra.json').filter((r) => !r.empty);
const inputs = extracted.map((r) => {
  const text = readFileSync(outPath('text', 'extra', `${r.id.replace(':', '_')}.txt`), 'utf8').split('\n').slice(3).join('\n').trim();
  return { id: r.id, teaser: r.teaser, input: toContentInput(r.title, text) };
});

const counted: { id: string; teaser: boolean; input: string; tokens: number }[] = [];
for (const item of inputs) counted.push({ ...item, tokens: (await tokenize(item.input)).length });
const tokens = counted.map((c) => c.tokens);

const distribution = {
  docs: tokens.length,
  p10: percentile(tokens, 10),
  p50: percentile(tokens, 50),
  p90: percentile(tokens, 90),
  p99: percentile(tokens, 99),
  max: Math.max(...tokens),
  over512: `${((tokens.filter((t) => t > 512).length / tokens.length) * 100).toFixed(0)}%`,
  over1024: `${((tokens.filter((t) => t > 1024).length / tokens.length) * 100).toFixed(0)}%`,
  over2048: `${((tokens.filter((t) => t > 2048).length / tokens.length) * 100).toFixed(0)}%`,
};
table([distribution]);
table(counted.filter((c) => c.teaser).map((c) => ({ id: c.id, tokens: c.tokens })));

const long = counted.filter((c) => c.tokens >= Math.max(...LIMITS)).slice(0, DOCS_PER_RUN);
console.log(`throughput set: ${long.length} docs with >= ${Math.max(...LIMITS)} tokens`);

const runs: Record<string, unknown>[] = [];
for (const limit of LIMITS) {
  const truncated: string[] = [];
  for (const doc of long) truncated.push((await truncateToTokens(doc.input, limit)).text);
  await embed(truncated.slice(0, 1));
  const meanTokens = tokens.reduce((sum, t) => sum + Math.min(t, limit), 0) / tokens.length;

  for (const batch of BATCHES) {
    const started = performance.now();
    let promptTokens = 0;
    for (let i = 0; i < truncated.length; i += batch) {
      promptTokens += (await embed(truncated.slice(i, i + batch))).promptTokens;
    }
    const seconds = (performance.now() - started) / 1000;
    const tokensPerSecond = promptTokens / seconds;
    const realisticDocsPerMin = (tokensPerSecond / meanTokens) * 60;
    runs.push({
      limit,
      batch,
      docs: truncated.length,
      seconds: +seconds.toFixed(1),
      tokensPerSecond: Math.round(tokensPerSecond),
      fullLengthDocsPerMin: Math.round((truncated.length / seconds) * 60),
      meanTokensReal: Math.round(meanTokens),
      realDocsPerMin: Math.round(realisticDocsPerMin),
      archiveDays: +(ARCHIVE / realisticDocsPerMin / 60 / 24).toFixed(1),
    });
  }
}
table(runs);
writeJson('tokens.json', { distribution, counted: counted.map(({ input, ...rest }) => rest), runs });
