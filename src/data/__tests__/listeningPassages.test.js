import { describe, it, expect } from 'vitest'
import LISTENING_PASSAGES from '../listeningPassages.js'

// Content-truth + answer-key integrity coverage for the Paper-4 listening bank.
// `correctIndex` is the GRADED key on two surfaces — Listening.jsx (renders
// `options[correctIndex]` + `explanation` verbatim as "Correct: …") and
// ExamRehearsal.jsx (scores the listening stage against it) — so a mismarked key
// teaches a confident-wrong answer, the worst failure for a learning tool.
// Until 2026-08-03 nothing imported this file at all; these tests close that gap.

const byId = (id) => LISTENING_PASSAGES.find((p) => p.id === id)

describe('listeningPassages — Malaysian emergency number (content truth)', () => {
  const cuaca = byId('berita-cuaca')
  const q = cuaca?.questions.find((x) => /talian kecemasan/i.test(x.question))

  it('the berita-cuaca passage and its emergency-number question exist', () => {
    expect(cuaca).toBeTruthy()
    expect(q).toBeTruthy()
  })

  // Angkatan Pertahanan Awam Malaysia (APM), the agency that ran 991, on its own
  // portal (civildefence.gov.my/999-emergency-services/): "Mulai 1 Oktober 2007
  // talian kecemasan 999 telah diperkenalkan … dengan menggabungkan semua nombor
  // kecemasan iaitu 991, 994 dan 999". 991 has been defunct since 2007 — a
  // student told to dial it in a flood is told something dangerous and wrong.
  it('tells students to call 999, never the defunct 991', () => {
    expect(cuaca.text).toContain('talian kecemasan 999')
    expect(cuaca.text).not.toContain('991')
  })

  it('keys 999 as the correct answer, so dialling 999 is not scored as a mistake', () => {
    expect(q.options[q.correctIndex]).toMatch(/999/)
    expect(q.explanation).toContain('999')
    expect(q.explanation).not.toContain('991')
  })

  // 991 and 994 stay in the option list: they are the historically real numbers
  // folded into 999, which is exactly what makes them good distractors.
  it('keeps the retired numbers as distractors only', () => {
    const distractors = q.options.filter((_, i) => i !== q.correctIndex)
    expect(distractors.some((o) => o.includes('991'))).toBe(true)
  })
})

describe('listeningPassages — answer-key integrity (all passages)', () => {
  it('every question has an in-range correctIndex resolving to a non-empty option', () => {
    for (const p of LISTENING_PASSAGES) {
      for (const q of p.questions) {
        expect(Array.isArray(q.options), `${p.id} q${q.id} options is an array`).toBe(true)
        expect(Number.isInteger(q.correctIndex), `${p.id} q${q.id} correctIndex is an integer`).toBe(true)
        expect(q.correctIndex, `${p.id} q${q.id} correctIndex >= 0`).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex, `${p.id} q${q.id} correctIndex in range`).toBeLessThan(q.options.length)
        const answer = q.options[q.correctIndex]
        expect(typeof answer, `${p.id} q${q.id} resolved answer is a string`).toBe('string')
        expect(answer.trim().length, `${p.id} q${q.id} resolved answer non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('question ids are unique within each passage, and passage ids are unique', () => {
    for (const p of LISTENING_PASSAGES) {
      const ids = p.questions.map((q) => q.id)
      expect(new Set(ids).size, `${p.id} has unique question ids`).toBe(ids.length)
    }
    const pids = LISTENING_PASSAGES.map((p) => p.id)
    expect(new Set(pids).size).toBe(pids.length)
  })

  // Listening.jsx:166 prints the explanation verbatim next to the correct option,
  // so an explanation quoting words the passage never said is itself a taught
  // falsehood — and it is how an edit to the transcript silently desyncs the key.
  it('every phrase an explanation quotes really appears in the passage text', () => {
    for (const p of LISTENING_PASSAGES) {
      for (const q of p.questions) {
        for (const [, quoted] of q.explanation.matchAll(/"([^"]+)"/g)) {
          // Explanations elide with "…" — each side of the ellipsis is its own quote.
          for (const fragment of quoted.split('…').map((s) => s.trim()).filter(Boolean)) {
            expect(p.text, `${p.id} q${q.id} quotes "${fragment}"`).toContain(fragment)
          }
        }
      }
    }
  })
})
