const prettier = require('./.prettierrc.json');

module.exports = {
  root: true,
  rules: {
    'no-unused-vars': 'off',
    'prettier/prettier': [
      'error',
      {
        ...prettier,
      },
    ],
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  env: {
    commonjs: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },
  overrides: [],
};
