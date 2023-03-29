import cspScriptHashes from './csp-script-hashes.js';

export default {
  directives: {
    'default-src': ['none'],
    'connect-src': ['self', 'https://vitals.vercel-analytics.com'],
    'font-src': ['self', 'data:'],
    'img-src': ['*', 'data:'],
    'script-src': ['self', ...cspScriptHashes],
    'style-src': ['self', 'unsafe-inline'],
    'manifest-src': ['self'],
  },
};
