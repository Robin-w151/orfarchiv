import { sveltekit } from '@sveltejs/kit/vite';
import dotenv from 'dotenv-flow';

dotenv.config();

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  server: {
    port: 3001,
  },
  define: {
    'import.meta.env.VERCEL_ANALYTICS_ID': JSON.stringify(process.env.VERCEL_ANALYTICS_ID),
  },
};

export default config;
