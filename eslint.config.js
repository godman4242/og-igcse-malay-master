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
      // Accessibility. The launch gate requires a REAL checker to be wired up rather than
      // hand-rolled greps for alt="" — see agent-harness/harness/launch-gate.
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
  {
    // Accessibility findings are WARNINGS, not errors, because pre-commit runs `npm run lint` and
    // 59 pre-existing issues would have blocked every commit — including unrelated ones — the
    // moment the checker was switched on. The ratchet is `--max-warnings` in the lint script:
    // existing debt is tolerated, NEW debt fails the commit. Lower that number as you fix things;
    // when it reaches the non-a11y baseline (3), delete this block so they become errors again.
    // Severities are derived from the plugin, so a plugin update cannot leave a rule unlisted.
    files: ['**/*.{js,jsx}'],
    rules: Object.fromEntries(
      Object.entries(jsxA11y.flatConfigs.recommended.rules)
        // Downgrade severity only. Three rules are deliberately 'off' in recommended
        // (anchor-ambiguous-text, control-has-associated-label, label-has-for) and mapping
        // those to 'warn' would ENABLE them — 18 extra findings that recommended never asked for.
        .filter(([, level]) => (Array.isArray(level) ? level[0] : level) !== 'off')
        .map(([rule]) => [rule, 'warn']),
    ),
  },
])
