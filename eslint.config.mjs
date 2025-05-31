import { defineConfig } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  {
    ignores: ['**/coverage', '**/dist', '**/e2e', '**/linter', '**/node_modules']
  },
  ...compat.extends(
      'prettier'
    ),
    {
    plugins: {
      prettier
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },

      ecmaVersion: 2023,
      sourceType: 'module'
    },

    rules: {
      'prettier/prettier': [
        'error',
        {
          trailingComma: 'none',
          singleQuote: true,
          printWidth: 120
        }
      ]
    }
  }
]
