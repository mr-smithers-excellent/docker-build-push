import { FlatCompat } from '@eslint/eslintrc';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

const compat = new FlatCompat();

export default [
  ...compat.extends('airbnb-base', 'prettier'),
  {
    plugins: {
      prettier: prettierPlugin
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'import/extensions': ['error', 'ignorePackages', { js: 'always' }],
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['tests/**'] }],
      'prettier/prettier': [
        'error',
        {
          trailingComma: 'none',
          singleQuote: true,
          printWidth: 120
        }
      ]
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  }
];
