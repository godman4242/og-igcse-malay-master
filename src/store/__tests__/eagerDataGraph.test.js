// C8 (2026-08-03): the eager `index-*.js` entry chunk — the bytes EVERY cold
// load pays before first paint — had grown to 527.5 KB / 168.0 KB gz against a
// ~471.7 KB figure recorded 2026-06-29.
//
// Measured cause: `src/data/dictionaryExamples.js` is 50.8 KB (pre-minify) of
// the entry chunk and roughly TRIPLED over July as the example-coverage grind
// took it from 254 to 704 sentences. It was eager only because three modules in
// the eager graph imported it statically:
//
//   src/store/useStore.js        (loadTopicPack + the v10 migration)
//   src/components/SearchModal.jsx      (statically imported by Layout)
//   src/components/SharedDeckImport.jsx (statically imported by SharedDeckGate)
//
// None of them needs it at first paint: they need it when the user loads a topic
// pack, opens Search and adds a word, or accepts a shared deck. Deferring it to
// those moments took the entry chunk 527.5 -> 479.1 KB raw / 167.9 -> 151.6 KB gz.
//
// This is deliberately NOT the same trick applied to src/data/dictionary.js.
// `src/lib/selectionToCard.js` derives a module-scope word set from it and is
// pulled in by SelectionToCard, which Layout mounts UNCONDITIONALLY — lazying
// that would just re-fetch the same bytes in a second request on every load,
// i.e. gaming the metric rather than cutting it. dictionary.js stays eager.
//
// This test pins the import shape so a future static import can't silently put
// the 50 KB back. Source-level on purpose: the property being protected is the
// module graph, which a behavioural test cannot see.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
// Strip line comments so this file's own explanation (and each module's
// "// don't static-import dictionaryExamples" note) can't satisfy the check.
const code = (rel) => readFileSync(resolve(here, rel), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '')

// A STATIC import — `import x from '...'` / `import { x } from '...'`.
// A dynamic `await import('...')` is fine: it lands in its own chunk.
const STATIC_EXAMPLES_IMPORT = /^\s*import\s[^;]*from\s+['"][^'"]*data\/dictionaryExamples['"]/m

describe('entry-chunk data graph stays lean (C8)', () => {
  const EAGER = [
    ['useStore', '../useStore.js'],
    ['SearchModal', '../../components/SearchModal.jsx'],
    ['SharedDeckImport', '../../components/SharedDeckImport.jsx'],
  ]

  for (const [name, rel] of EAGER) {
    it(`${name} does not statically import dictionaryExamples`, () => {
      expect(code(rel)).not.toMatch(STATIC_EXAMPLES_IMPORT)
    })

    it(`${name} still reaches it dynamically (the feature is deferred, not deleted)`, () => {
      expect(code(rel)).toMatch(/import\(\s*['"][^'"]*data\/dictionaryExamples['"]\s*\)/)
    })
  }

  it('dictionary.js stays eager — selectionToCard needs it synchronously and always mounts', () => {
    expect(code('../../lib/selectionToCard.js')).toMatch(/^\s*import\s+DICTIONARY\s+from\s+['"][^'"]*data\/dictionary['"]/m)
  })
})
