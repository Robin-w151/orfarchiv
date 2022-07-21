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
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
};
