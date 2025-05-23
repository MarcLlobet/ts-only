// *@ts-check*  

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config({
  files: ['src/**/*.ts'],
  ignores: ['node_modules', 'dist', '**/*.js'],
  extends: [
    eslint.configs.recommended,
    tseslint.configs.recommended,
    prettier,
  ],
  rules: {
    '@typescript-eslint/no-require-imports': 'off',
  },
});
