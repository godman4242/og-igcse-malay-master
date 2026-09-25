// jsx-a11y runs at "error" (eslint.config.js), so the only way past a rule is an
// eslint-disable comment. This pins that every such exception says WHY after
// ` -- ` — a bare disable is how the 59 warnings accumulated unexamined.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative, join } from 'node:path'

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { if (name !== '__tests__') walk(p) }
    else if (/\.jsx?$/.test(name)) files.push(p)
  }
}
walk(src)

// A reason is at least a few words, not "-- ok".
const REASONED = /\s--\s+\S+(\s+\S+){3,}/

describe('jsx-a11y exceptions', () => {
  it('every eslint-disable of a jsx-a11y rule names its reason', () => {
    const bare = []
    for (const f of files) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/eslint-disable/.test(line) && /jsx-a11y\//.test(line) && !REASONED.test(line)) {
          bare.push(`${relative(src, f)}:${i + 1}`)
        }
      })
    }
    expect(bare).toEqual([])
  })

  // A disable that names no rule silences EVERY rule on that line, jsx-a11y included.
  it('no bare eslint-disable (one that names no rule)', () => {
    const bare = []
    for (const f of files) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/eslint-disable(-next-line|-line)?\s*(\*\/\}?)?\s*$/.test(line)) bare.push(`${relative(src, f)}:${i + 1}`)
      })
    }
    expect(bare).toEqual([])
  })

  it('no file switches jsx-a11y off wholesale', () => {
    const wholesale = files
      .filter((f) => /eslint-disable(?!-next-line|-line)[^\n]*jsx-a11y|eslint-disable\s*\*\//.test(readFileSync(f, 'utf8')))
      .map((f) => relative(src, f))
    expect(wholesale).toEqual([])
  })
})
