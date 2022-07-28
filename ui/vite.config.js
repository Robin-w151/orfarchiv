import { sveltekit } from '@sveltejs/kit/vite';
import dotenv from 'dotenv-flow';

dotenv.config();

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  server: {
    port: 3001,
  },
};

export default config;
