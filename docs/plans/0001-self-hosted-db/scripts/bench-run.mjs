#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

const {
  BENCH_BASE_URL,
  BENCH_TOKEN,
  BENCH_ROUNDS = '5',
  BENCH_WARM_N = '30',
  BENCH_COLD_N = '20',
  BENCH_EXPECT_REGION = 'fra1',
  BENCH_OUT,
} = process.env;

if (!BENCH_BASE_URL || !BENCH_TOKEN) {
  console.error('BENCH_BASE_URL and BENCH_TOKEN are required');
  process.exit(1);
}

const TARGETS = ['vps', 'm0'];
const QUERIES = ['keyword', 'vector', 'distinct', 'findOne'];
const LABELS = {
  keyword: 'keyword search',
  vector: '`$vectorSearch`',
  distinct: '`distinct` ×2',
  findOne: '`findOne(url)`',
};
const TARGET_LABELS = { vps: 'VPS', m0: 'M0' };

const pooled = {};
for (const target of TARGETS) {
  pooled[target] = {
    warm: emptySamples(),
    cold: emptySamples(),
    connect: [],
    connectionsOpened: [],
  };
}
const raw = [];

for (let round = 0; round < Number(BENCH_ROUNDS); round++) {
  const order = round % 2 === 0 ? TARGETS : [...TARGETS].reverse();
  for (const mode of ['warm', 'cold']) {
    for (const target of order) {
      const n = mode === 'warm' ? BENCH_WARM_N : BENCH_COLD_N;
      const result = await call(target, mode, n);
      raw.push({ round, at: new Date().toISOString(), ...result });
      for (const query of QUERIES) {
        pooled[target][mode][query].push(...result.samples[query]);
      }
      if (mode === 'cold') {
        pooled[target].connect.push(...result.connect);
        pooled[target].connectionsOpened.push(...result.connectionsOpened);
      }
      console.error(`round ${round + 1}/${BENCH_ROUNDS} ${mode} ${target} (${result.region}) ok`);
    }
  }
}

const out = BENCH_OUT ?? `bench-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(out, JSON.stringify(raw, null, 2));
console.error(`raw samples written to ${out}\n`);

console.log('| Query | Target | p50 warm | p95 warm | p50 cold | p95 cold | n warm / cold |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const query of QUERIES) {
  for (const target of TARGETS) {
    const { warm, cold } = pooled[target];
    console.log(
      `| ${LABELS[query]} | ${TARGET_LABELS[target]} | ${fmt(warm[query], 50)} | ${fmt(warm[query], 95)} | ${fmt(cold[query], 50)} | ${fmt(cold[query], 95)} | ${warm[query].length} / ${cold[query].length} |`,
    );
  }
}
for (const target of TARGETS) {
  const { connect, connectionsOpened } = pooled[target];
  console.log(
    `| connect only | ${TARGET_LABELS[target]} | – | – | ${fmt(connect, 50)} | ${fmt(connect, 95)} | – / ${connect.length} |`,
  );
  console.log(`\n${TARGET_LABELS[target]}: connections opened per cold sample: ${summarize(connectionsOpened)}`);
}

async function call(target, mode, n) {
  const url = new URL('/api/bench', BENCH_BASE_URL);
  url.search = new URLSearchParams({ target, mode, n }).toString();
  const response = await fetch(url, { headers: { authorization: `Bearer ${BENCH_TOKEN}` } });
  if (!response.ok) {
    throw new Error(`${target}/${mode}: HTTP ${response.status} ${await response.text()}`);
  }
  const result = await response.json();
  if (BENCH_EXPECT_REGION && result.region !== BENCH_EXPECT_REGION) {
    throw new Error(`${target}/${mode}: ran in region '${result.region}', expected '${BENCH_EXPECT_REGION}'`);
  }
  return result;
}

function emptySamples() {
  return Object.fromEntries(QUERIES.map((query) => [query, []]));
}

function percentile(values, p) {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function fmt(values, p) {
  const value = percentile(values, p);
  return value === undefined ? '–' : `${value.toFixed(1)} ms`;
}

function summarize(values) {
  const counts = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([connections, count]) => `${connections}×${count}`)
    .join(', ');
}
