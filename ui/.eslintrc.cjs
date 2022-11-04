module.exports = {
  root: true,
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-unused-vars': 'off',
    'svelte/no-at-html-tags': 'off',
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
  ],
  plugins: ['svelte3', '@typescript-eslint'],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    tsconfigRootDir: __dirname,
    extraFileExtensions: ['.svelte'],
  },
  overrides: [
    {
      files: ['*.svelte'],
      processor: 'svelte3/svelte3',
    },
  ],
  settings: {
    'svelte3/typescript': () => require('typescript'),
  }
};
