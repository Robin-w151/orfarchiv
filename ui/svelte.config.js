import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import preprocess from 'svelte-preprocess';

const useAdapterNode = process.env.USE_ADAPTER_NODE === 'true';
const disableCsp = process.env.DISABLE_CSP === 'true';

const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess({
    postcss: true,
  }),
  kit: {
    adapter: useAdapterNode ? adapterNode() : adapterVercel(),
    csp: disableCsp
      ? undefined
      : {
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
