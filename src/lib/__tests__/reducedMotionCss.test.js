// prefers-reduced-motion guard — pins that the app's primary ENTRANCE
// animation (.animate-fadeUp, the fadeUp keyframe used 82× across 40 files) is
// disabled under `prefers-reduced-motion: reduce`, alongside .page-transition.
// Both use the identical translate-based `fadeUp` keyframe; the media query
// previously exempted only .page-transition, so a motion-sensitive learner
// still got 82 sliding entrance animations. This reads index.css as source
// (mirrors themeContrast.test.js) so a future edit can't silently re-drop it.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../../index.css'), 'utf8')

// Extract the full body of the `@media (prefers-reduced-motion: reduce) { ... }`
// block by brace-matching (the block contains nested rule braces).
function reducedMotionBlock(source) {
  const marker = '@media (prefers-reduced-motion: reduce)'
  const start = source.indexOf(marker)
  if (start === -1) throw new Error('reduced-motion media query not found in index.css')
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(open + 1, i)
    }
  }
  throw new Error('unbalanced braces in reduced-motion media query')
}

describe('prefers-reduced-motion disables motion animations', () => {
  const block = reducedMotionBlock(css)

  it('disables the .animate-fadeUp entrance animation', () => {
    expect(block).toMatch(/\.animate-fadeUp/)
    // and the rule carrying it zeroes the animation
    expect(block).toMatch(/animation:\s*none/)
  })

  it('still disables the .page-transition route animation (regression guard)', () => {
    expect(block).toMatch(/\.page-transition/)
  })
})
