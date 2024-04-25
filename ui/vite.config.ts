import { sveltekit } from '@sveltejs/kit/vite';
import dotenv from 'dotenv-flow';
import type { UserConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import manifest from './src/assets/manifest';

dotenv.config({ silent: true });

const config = {
  define: {
    'import.meta.env.VERCEL_ANALYTICS_ID': JSON.stringify(process.env.VERCEL_ANALYTICS_ID),
    'import.meta.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
    'process.env.NODE_ENV': '"production"',
  },
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      strategies: 'injectManifest',
      manifest,
      minify: false,
      devOptions: {
        enabled: true,
        suppressWarnings: process.env.SUPPRESS_WARNING === 'true',
        type: 'module',
        navigateFallback: '/',
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
  server: {
    port: 3001,
  },
  preview: {
    port: 3301,
  },
} satisfies UserConfig;

export default config;
