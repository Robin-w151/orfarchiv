import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import cspConfig from './csp-config.js';

const useAdapterNode = process.env.USE_ADAPTER_NODE === 'true';
const isCspDisabled = process.env.DISABLE_CSP === 'true';

const adapter = useAdapterNode ? adapterNode() : adapterVercel();
const csp = isCspDisabled ? undefined : cspConfig;

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter,
    alias: {
      $assets: resolve('./src/assets'),
      $lib: resolve('./src/lib'),
    },
    csp,
  },
};

export default config;
