import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import preprocess from 'svelte-preprocess';

const useAdapterNode = process.env.USE_ADAPTER_NODE;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess({
    postcss: true,
  }),
  kit: {
    adapter: useAdapterNode ? adapterNode() : adapterVercel(),
    csp: {
      directives: {
        'default-src': ['none'],
        'connect-src': ['self', 'https://vitals.vercel-analytics.com'],
        'font-src': ['self', 'data:'],
        'img-src': ['*', 'data:'],
        'script-src': ['self', 'sha256-yzyqz6goBMMs4IDXDK6aJMrqy/rGVe0pmG0JBf6EgTQ='],
        'style-src': ['self', 'unsafe-inline'],
      },
    },
  },
};

export default config;
