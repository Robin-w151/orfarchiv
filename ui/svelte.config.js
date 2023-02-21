import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/kit/vite';
import cspScriptHashes from './csp-script-hashes.json' assert { type: 'json' };

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
        'script-src': ['self', ...cspScriptHashes],
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

export default config;
