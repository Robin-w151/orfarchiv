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
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
    'plugin:storybook/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint'],
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
