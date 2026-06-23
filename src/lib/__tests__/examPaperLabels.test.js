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
import KNOWLEDGE_BASE, {
  getEntryById,
  getSuggestedPrompts,
  TOPICS,
} from '../../data/cikguKnowledge.js'
import { COMPREHENSION_SYSTEM } from '../../data/systemPrompts.js'

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

// ───────────────────────────────────────────────────────────────────────────
// Cikgu Maya is the single-syllabus MALAY tutor, so (per the 2026-06-22 decision)
// it KEEPS a paper number — but it must be the VERIFIED-CORRECT one. Its KB used
// an outdated scheme (Reading = Paper 1, Writing = Paper 2); the real Cambridge
// IGCSE Malay 0546 (2025–27, web-verified 2026-06-23) is:
//   Paper 1 = Listening · Paper 2 = Reading · Paper 3 = Speaking · Paper 4 = Writing.
// So Cikgu reading tips must say Paper 2 and Cikgu writing tips must say Paper 4.
// NB the entry IDs ('exam-paper1' = reading, 'exam-paper2' = writing) are LEGACY
// opaque keys — they are NOT the paper number and must not be "fixed" to match it.
describe('Cikgu Maya — IGCSE Malay 0546 paper numbers (content-truth, web-verified 2026-06-23)', () => {
  it('reading-comprehension tips name Paper 2, never the old wrong Paper 1', () => {
    const e = getEntryById('exam-paper1')
    expect(e).toBeTruthy()
    expect(e.title).toBe('Paper 2 (Reading Comprehension) Tips')
    expect(e.answer).toMatch(/Paper 2/)
    expect(e.answer).not.toMatch(/Paper 1\b/)
  })

  it('writing exam strategy names Paper 4, never the old wrong Paper 2', () => {
    const e = getEntryById('exam-paper2')
    expect(e).toBeTruthy()
    expect(e.title).toBe('Paper 4 (Writing) Exam Strategy')
    expect(e.answer).toMatch(/Paper 4/)
    expect(e.answer).not.toMatch(/Paper 2\b/)
  })

  it('every Malay WRITING structure entry names Paper 4, never Paper 2 (= Reading)', () => {
    const writing = KNOWLEDGE_BASE.filter((e) => e.topic === TOPICS.PENULISAN)
    expect(writing.length).toBeGreaterThan(0)
    for (const e of writing) expect(e.title).not.toMatch(/Paper 2/)
    for (const id of ['penulisan-essay', 'penulisan-rencana', 'penulisan-laporan', 'penulisan-syarahan']) {
      expect(getEntryById(id).title).toMatch(/Paper 4/)
    }
  })

  it('the reading suggestion chip names Paper 2, never Paper 1', () => {
    const chips = getSuggestedPrompts().map((c) => c.text).join(' | ')
    expect(chips).toMatch(/Paper 2 reading comprehension tips/i)
    expect(chips).not.toMatch(/Paper 1/)
  })

  it('no entry in the Malay KB references Paper 1 (Malay Paper 1 = Listening, which Cikgu does not cover)', () => {
    // Cikgu covers reading (P2) / writing (P4) / speaking (P3). A stray "Paper 1"
    // means the old reading mislabel (or a new one) has crept back in.
    expect(src('../../data/cikguKnowledge.js')).not.toMatch(/Paper\s*1\b/)
  })

  it('the Malay comprehension AI prompt asks for Paper 2 (reading), not Paper 1', () => {
    expect(COMPREHENSION_SYSTEM).toMatch(/Paper 2/)
    expect(COMPREHENSION_SYSTEM).not.toMatch(/Paper 1\b/)
  })

  it('comprehensionPassages.js (bilingual corpus) carries no paper number', () => {
    expect(src('../../data/comprehensionPassages.js')).not.toMatch(PAPER_NUMBER)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// dictionary.js is a single-syllabus MALAY (0546) vocab list. Its vocab-category
// comments label PRODUCTIVE vocab — essay WRITING (Paper 4) and SPEAKING (Paper 3).
// Two comments used the old confident-wrong scheme that tied them to "Paper 2"
// ("Formal Register (Paper 2 essay)", "Abstract Nouns (Paper 2 & 3)"). But Malay
// 0546 Paper 2 = READING (a comprehension paper, not an authored-vocab category),
// so no vocab comment here should carry "Paper 2". Essay = Paper 4; abstract nouns
// serve speaking + writing = Paper 3 & 4. (Web-verified vs the official Cambridge
// 2025–27 syllabus assessment overview, 2026-06-23.)
describe('dictionary.js — Malay vocab category paper numbers (content-truth, web-verified 2026-06-23)', () => {
  const dict = src('../../data/dictionary.js')

  it('Formal Register essay vocab is tagged Paper 4 (essay = Writing), never Paper 2', () => {
    expect(dict).toMatch(/Formal Register \(Paper 4 essay\)/)
    expect(dict).not.toMatch(/Formal Register \(Paper 2/)
  })

  it('Abstract Nouns vocab is tagged for Speaking + Writing (Paper 3 & 4), never Paper 2', () => {
    expect(dict).toMatch(/Abstract Nouns \(Paper 3 & 4\)/)
    expect(dict).not.toMatch(/Abstract Nouns \(Paper 2/)
  })

  it('no vocab-category comment ties productive vocab to "Paper 2" (Paper 2 = Reading)', () => {
    // General source-scan guard: any NEW "Paper 2" tag added to this Malay vocab
    // file would be the same confident-wrong scheme (Paper 2 = Reading, not a
    // productive-vocab paper). Forces a deliberate content check on any "Paper 2".
    const offenders = dict.split('\n').filter((l) => /Paper\s*2/i.test(l))
    expect(offenders).toEqual([])
  })
})
