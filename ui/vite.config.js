import { sveltekit } from '@sveltejs/kit/vite';
import dotenv from 'dotenv-flow';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ silent: true });

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  server: {
    port: 3001,
  },
  define: {
    'import.meta.env.VERCEL_ANALYTICS_ID': JSON.stringify(process.env.VERCEL_ANALYTICS_ID),
    'import.meta.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
    },
  },
};

export default config;
