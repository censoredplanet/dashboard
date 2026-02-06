import js from '@eslint/js';
import globals from 'globals';
import google from 'eslint-config-google';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';


export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.observablehq/**'
    ],
  },
  {
    files: ['src/components/**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...google.rules,
      ...prettier.rules,

      'valid-jsdoc': 'off',
      'require-jsdoc': 'off',
      'no-invalid-this': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }
      ],

      'import/no-duplicates': 'error',
      'import/order': ['warn', { 'newlines-between': 'always' }],
    },
  },
];
