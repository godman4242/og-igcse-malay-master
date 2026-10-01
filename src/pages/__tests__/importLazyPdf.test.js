// GOAL #52 — opening /import downloaded and ran all of pdf.js (~330 KB raw) up
// front because Import.jsx statically imported `extractPdfText` from lib/pdf,
// even for a learner who only pastes text (PDF is one optional picker). The
// handler now dynamic-imports lib/pdf, the reader's lazy pattern. Source-level on
// purpose (as eagerDataGraph.test.js): the property is the module graph, which a
// behavioural test with `vi.mock('../lib/pdf')` cannot see.
import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(resolve(here, '../Import.jsx'), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '')

it('Import.jsx does not statically import lib/pdf (pdf.js stays off the /import chunk)', () => {
  expect(src).not.toMatch(/^\s*(?:import|export)\s[^;]*from\s+['"][^'"]*lib\/pdf(?:\.js)?['"]/m)
})

it('the PDF picker still reaches lib/pdf dynamically (deferred, not deleted)', () => {
  expect(src).toMatch(/import\(\s*['"][^'"]*lib\/pdf(?:\.js)?['"]\s*\)/)
})
