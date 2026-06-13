import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `npm run lint` is `eslint .` and ESLint only auto-ignores node_modules — so any
  // gitignored sibling dir with vendored .js (a Python venv, a cloned repo, raw model
  // exports) would get linted. Ignore the generated/throwaway dirs, mirroring .gitignore.
  globalIgnores([
    'dist', 'scripts/**', 'public/ocr/**', 'public/asr/**',
    '.venv-asr/**', 'tmp-asr-fixtures/**', 'transformers.js/**', 'mesolitica-onnx/**',
  ]),
  {
    files: ['api/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
