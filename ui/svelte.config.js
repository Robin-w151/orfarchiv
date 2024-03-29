import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import cspConfig from './csp-config.js';

const useAdapterNode = process.env.USE_ADAPTER_NODE === 'true';
const isCspDisabled = process.env.DISABLE_CSP === 'true';

const adapter = useAdapterNode ? adapterNode() : adapterVercel();
const csp = isCspDisabled ? undefined : cspConfig;

const config = {
  compilerOptions: {
    enableSourcemap: true,
  },
  preprocess: [
    vitePreprocess({
      postcss: true,
    }),
  ],
  kit: {
    adapter,
    csp,
    output: {
      preloadStrategy: 'preload-mjs',
    },
  },
};

export default config;
