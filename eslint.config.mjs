import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const reactRecommended = reactPlugin.configs.flat?.recommended ?? { rules: {} };
const reactHooksRecommended = reactHooksPlugin.configs.recommended ?? { rules: {} };

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['core/**/*.ts'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: ['./core/tsconfig.json'],
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['dashboard/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: ['./dashboard/tsconfig.app.json'],
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactRecommended.rules,
      ...reactHooksRecommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
);

