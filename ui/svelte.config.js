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
        'font-src': ['self', 'data:'],
        'img-src': ['*', 'data:'],
        'script-src': ['self', 'sha256-DBD2RdrVtIyRnxKaZ2mQWvn0vcX69mbRtrk0F7vSMgo='],
        'style-src': ['self', 'unsafe-inline'],
      },
    },
  },
};

export default config;
