import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/kit/vite';
import { readFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import crypto from 'crypto';

const useAdapterNode = process.env.USE_ADAPTER_NODE === 'true';
const disableCsp = process.env.DISABLE_CSP === 'true';

const adapter = useAdapterNode ? adapterNode() : adapterVercel();
const csp = disableCsp
  ? undefined
  : {
      directives: {
        'default-src': ['none'],
        'connect-src': ['self', 'https://vitals.vercel-analytics.com'],
        'font-src': ['self', 'data:'],
        'img-src': ['*', 'data:'],
        'script-src': ['self', ...(await calculateScriptHashes())],
        'style-src': ['self', 'unsafe-inline'],
      },
    };

const config = {
  preprocess: [
    vitePreprocess({
      postcss: true,
    }),
  ],
  kit: {
    adapter,
    csp,
  },
};

async function calculateScriptHashes() {
  const decoder = new TextDecoder('utf-8');
  const appHtml = decoder.decode(await readFile('src/app.html'));

  const appDocument = new JSDOM(appHtml).window.document;
  const appearanceScript = appDocument.getElementsByTagName('script')[0];
  const appearanceScriptHash = await calculateScriptHash(appearanceScript.textContent);

  return [appearanceScriptHash];
}

async function calculateScriptHash(scriptText) {
  const textEncoder = new TextEncoder('utf-8').encode(scriptText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', textEncoder);
  const hashString = Buffer.from(hashBuffer).toString('base64');

  return `sha256-${hashString}`;
}

export default config;
