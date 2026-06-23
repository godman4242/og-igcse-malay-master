// Content-truth guard (axis-1, GOAL.md): the IGCSE listening / reading paper
// NUMBER must never appear on a BILINGUAL / shared surface, because the verified
// number differs by syllabus, so no single number is correct for every learner:
//
//   Cambridge IGCSE Malay – Foreign Language 0546 (2025–27, web-verified
//     2026-06-23): Paper 1 = Listening · Paper 2 = Reading · Paper 3 = Speaking ·
//     Paper 4 = WRITING.
//   Cambridge IGCSE English – Second Language 0510 (2024–26, web-verified
//     2026-06-23): Paper 1 = Reading & Writing · Paper 2 = Listening ·
//     Component 3 = Speaking.
//
// So "Listening (Paper 4)" was confident-WRONG for everyone (Paper 4 is the
// Malay WRITING paper; listening is Paper 1 for Malay / Paper 2 for English).
// Decision (Kheshav-cleared 2026-06-22): on bilingual / shared surfaces DROP the
// paper number and label by skill; keep a paper number ONLY in single-syllabus,
// verified-correct WRITING context (Malay Paper 4 = Writing — e.g. TemplatesView).
//
// This pins the corrected ExamRehearsal + Listening + Comprehension surfaces and
// the tourSteps / pageGuides listening+reading copy so the wrong number can't
// regress. Source-scan style mirrors contentLint.test.js / studyFeedbackA11y.test.js.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { FULL_TOUR } from '../guide/tourSteps.js'
import { PAGE_GUIDES } from '../guide/pageGuides.js'

const here = dirname(fileURLToPath(import.meta.url))
const src = (p) => readFileSync(resolve(here, p), 'utf8')

// Any paper NUMBER glued to the word "Paper" — "Paper 4", "Paper-4", "Paper4".
const PAPER_NUMBER = /Paper[\s-]*\d/i
// The exact wrong listening label, in any spacing.
const LISTENING_PAPER = /Listening\s*\(\s*Paper/i

const flattenGuide = (steps) =>
  steps.map((s) => `${s.title || ''} ${s.body || ''} ${s.example || ''}`).join(' ')

describe('exam paper labels — no listening/reading paper number on bilingual surfaces (content-truth)', () => {
  it('the FULL_TOUR listening step is labelled by skill, not "Paper 4"', () => {
    const step = FULL_TOUR.find((s) => s.route === '/listening')
    expect(step).toBeDefined()
    expect(step.title).toBe('Listening')
    expect(step.title).not.toMatch(PAPER_NUMBER)
  })

  it('the /listening page-guide copy carries no paper number', () => {
    expect(flattenGuide(PAGE_GUIDES['/listening'])).not.toMatch(PAPER_NUMBER)
  })

  it('the /comprehension page-guide copy carries no paper number', () => {
    expect(flattenGuide(PAGE_GUIDES['/comprehension'])).not.toMatch(PAPER_NUMBER)
  })

  it('ExamRehearsal.jsx (bilingual) shows no "Listening (Paper …)" and no paper number', () => {
    const s = src('../../pages/ExamRehearsal.jsx')
    expect(s).not.toMatch(LISTENING_PAPER)
    expect(s).not.toMatch(PAPER_NUMBER)
  })

  it('Listening.jsx (bilingual picker) heading carries no paper number', () => {
    expect(src('../../pages/Listening.jsx')).not.toMatch(PAPER_NUMBER)
  })

  it('Comprehension.jsx (bilingual picker) heading + meta carry no paper number', () => {
    expect(src('../../pages/Comprehension.jsx')).not.toMatch(PAPER_NUMBER)
  })

  it('passageOrder.js + listeningPassages.js comments carry no paper number', () => {
    expect(src('../passageOrder.js')).not.toMatch(PAPER_NUMBER)
    expect(src('../../data/listeningPassages.js')).not.toMatch(PAPER_NUMBER)
  })

  it('KEEP boundary: Malay WRITING context still names Paper 4 (Paper 4 = Writing, verified-correct)', () => {
    // Guards against over-stripping: TemplatesView teaches Malay 0546 Paper 4
    // (Writing) karangan — that number is correct and must stay.
    expect(src('../../components/writing/TemplatesView.jsx')).toMatch(/Paper 4/)
  })
})
