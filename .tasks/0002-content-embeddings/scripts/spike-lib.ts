import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { MongoClient, Binary } from 'mongodb';

export const DB_URL = process.env.ORFARCHIV_DB_URL ?? 'mongodb://orfarchiv:orfarchiv@orfarchiv-db-1/?directConnection=true';
export const EMBEDDING_ROOT = (process.env.ORFARCHIV_EMBEDDING_URL ?? 'http://orfarchiv-embeddings:8080/v1').replace(/\/v1\/?$/, '');
export const OUT = process.env.SPIKE_OUT ?? '/tmp/orfarchiv-spike';
export const USER_AGENT = 'orfarchiv-spike (+https://orfarchiv.news)';

mkdirSync(OUT, { recursive: true });

export type SampleStory = { id: string; title: string; url: string; source: string; timestamp: string };

export function outPath(...parts: string[]) {
  return join(OUT, ...parts);
}

export function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(outPath(name), 'utf8')) as T;
}

export function writeJson(name: string, data: unknown) {
  writeFileSync(outPath(name), JSON.stringify(data, null, 2));
}

export function hasJson(name: string) {
  return existsSync(outPath(name));
}

export async function withDb<T>(fn: (client: MongoClient) => Promise<T>): Promise<T> {
  const client = await MongoClient.connect(DB_URL);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export function percentile(values: number[], p: number) {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

export function quantize(values: ReadonlyArray<number>): Binary {
  const maxAbs = values.filter((v) => !Number.isNaN(v)).reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  const scale = maxAbs === 0 ? 0 : 127 / maxAbs;
  return Binary.fromInt8Array(Int8Array.from(values, (v) => Math.max(-127, Math.min(127, Math.round(v * scale)))));
}

export function toContentInput(title: string, body: string) {
  return `title: ${title} | text: ${body}`;
}

export async function tokenize(content: string, withPieces = false): Promise<Array<number | { id: number; piece: string }>> {
  const response = await fetch(`${EMBEDDING_ROOT}/tokenize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content, with_pieces: withPieces }),
  });
  if (!response.ok) throw new Error(`tokenize ${response.status}: ${await response.text()}`);
  return ((await response.json()) as { tokens: Array<number | { id: number; piece: string }> }).tokens;
}

export async function truncateToTokens(text: string, maxTokens: number) {
  const tokens = (await tokenize(text, true)) as Array<{ id: number; piece: string }>;
  if (tokens.length <= maxTokens) return { text, tokens: tokens.length };
  return { text: tokens.slice(0, maxTokens).map((t) => t.piece).join(''), tokens: maxTokens };
}

export async function embed(inputs: string[]): Promise<{ vectors: number[][]; promptTokens: number }> {
  const response = await fetch(`${EMBEDDING_ROOT}/v1/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: inputs }),
  });
  if (!response.ok) throw new Error(`embeddings ${response.status}: ${await response.text()}`);
  const json = (await response.json()) as { data: { index: number; embedding: number[] }[]; usage: { prompt_tokens: number } };
  return {
    vectors: json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding),
    promptTokens: json.usage?.prompt_tokens ?? 0,
  };
}

export function table(rows: Record<string, unknown>[]) {
  console.table(rows);
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
