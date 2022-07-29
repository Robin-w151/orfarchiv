const prettier = require('./.prettierrc.json');

module.exports = {
  root: true,
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-unused-vars': 'off',
    'svelte/no-at-html-tags': 'off',
    'prettier/prettier': [
      'error',
      {
        ...prettier,
      },
    ],
  },
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:svelte/recommended', 'plugin:prettier/recommended'],
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
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  ],
};
