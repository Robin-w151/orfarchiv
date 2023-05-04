import { sveltekit } from '@sveltejs/kit/vite';
import dotenv from 'dotenv-flow';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { UserConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ silent: true });

const config = {
  plugins: [sveltekit()],
  server: {
    port: 3001,
  },
  preview: {
    port: 3301,
  },
  define: {
    'import.meta.env.VERCEL_ANALYTICS_ID': JSON.stringify(process.env.VERCEL_ANALYTICS_ID),
    'import.meta.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
    'process.env.NODE_ENV': '"production"',
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
    },
  },
  build: {
    sourcemap: true,
  },
} satisfies UserConfig;

export default config;
