// Node ESM resolver hook — lets a plain `node` script import the app's source
// modules, which use Vite-style EXTENSIONLESS relative imports (e.g.
// `import { FORM_ML } from '../data/writing'`). Node's default ESM resolver
// requires the `.js`; Vite adds it. This hook appends `.js` (then `/index.js`)
// to any unresolved relative specifier, so the harness runs the REAL product
// code (e.g. writingGrader.score) instead of a drifting copy.
//
// Used by scripts/ai-tier-eval/harness.mjs via:  node --import ./scripts/lib/extless-resolver.mjs ...
// (mirrors how the OCR harness imports pure src/lib modules, but covers the
// transitive extensionless chain that writingGrader pulls in.)

import { register } from 'node:module'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
        const hasExt = /\\.[cm]?[jt]sx?$/.test(specifier)
        if (isRelative && !hasExt) {
          // Try "<spec>.js" first, then "<spec>/index.js"; fall back to the
          // original so a genuinely-missing module still throws the real error.
          try { return await next(specifier + '.js', context) } catch {}
          try { return await next(specifier + '/index.js', context) } catch {}
        }
        return next(specifier, context)
      }
    `),
  import.meta.url,
)
