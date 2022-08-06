import adapter from '@sveltejs/adapter-vercel';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess({
    postcss: true,
  }),
  kit: {
    adapter: adapter(),
    csp: {
      directives: {
        'default-src': ['none'],
        'connect-src': ['self', 'https://vitals.vercel-analytics.com'],
        'font-src': ['self'],
        'img-src': ['*'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
      },
    },
  },
};

export default config;
