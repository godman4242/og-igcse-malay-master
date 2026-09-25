import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
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
      // Accessibility, at the plugin's own "error" level. The launch gate requires a REAL
      // checker rather than hand-rolled greps for alt="" — see agent-harness/harness/launch-gate.
      // A justified exception is an eslint-disable-next-line naming its reason after `--`.
      jsxA11y.flatConfigs.recommended,
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
