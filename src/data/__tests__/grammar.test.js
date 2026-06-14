// Content-truth pins for the Malay grammar drills. A learning tool ships the
// answer key itself, so a mislabeled morphology rule teaches the wrong thing —
// the worst failure for this app. These guard the `menge-` allomorph, which is
// the most error-prone meN- rule because it applies ONLY to one-syllable
// (ekasuku) roots (cat→mengecat, lap→mengelap, bom→mengebom). Two-syllable
// k-initial roots like "kejar" instead use the k-drop rule (meng- + kejar →
// mengejar), exactly like karang→mengarang.
//
// Web-verified: menge- = one-syllable roots only — kuihbahasa.com/imbuhan-men,
// cikgutancl.blogspot.com/2016/02/informasi-bahasa-imbuhan-menge-dan.html.
import { describe, it, expect } from 'vitest'
import { IMBUHAN_DRILLS, GRAMMAR_RULES } from '../grammar'
import { GRAMMAR_FEEDBACK } from '../feedbackRules'

// Count Malay syllables ≈ number of vowel groups (runs of a/e/i/o/u). "kejar"
// → e,a → 2; "cat"/"lap"/"bom" → 1. Good enough to assert the ekasuku invariant.
const syllableCount = (word) => (word.toLowerCase().match(/[aeiou]+/g) || []).length

describe('grammar.js — meN- menge- allomorph content truth', () => {
  it('only ever labels a ONE-syllable root with the "menge- + 1-syllable" rule', () => {
    const mengeRoots = IMBUHAN_DRILLS.filter(
      (d) => d.type === 'prefix' && d.rule === 'menge- + 1-syllable',
    )
    expect(mengeRoots.length).toBeGreaterThan(0) // cat, lap — guard against vacuity
    for (const d of mengeRoots) {
      expect(syllableCount(d.root), `${d.root} → ${d.answer} mislabeled menge-`).toBe(1)
    }
  })

  it('teaches "kejar → mengejar" via the k-drop rule, not menge- (kejar is 2 syllables)', () => {
    const kejar = IMBUHAN_DRILLS.find((d) => d.id === 'prefix-meN-kejar')
    expect(kejar).toBeDefined()
    expect(kejar.answer).toBe('mengejar')
    expect(syllableCount(kejar.root)).toBe(2)
    expect(kejar.rule).toBe('meng- + k → k drops')
  })

  it('GRAMMAR_RULES meN- menge- example lists only true monosyllabic forms', () => {
    const menge = GRAMMAR_RULES['meN-'].rules.find((r) => r.pattern.startsWith('menge-'))
    expect(menge).toBeDefined()
    // mengejar is a k-drop form (kejar = 2 syllables) — it must NOT appear here.
    expect(menge.example).not.toMatch(/mengejar/)
    expect(menge.example).toMatch(/mengecat/)
    expect(menge.example).toMatch(/mengelap/)
  })
})

// The meN-/peN- nasal-assimilation tables: each derived word has exactly ONE
// correct allomorph, so an example word must never sit under two different rules
// of the same prefix. "penulis" (root tulis → t drops → pen-) was wrongly listed
// BOTH under "No change" AND "T drops" — a word in two contradictory rules is the
// smoking-gun signature of this bug class. Web-verified: peN- stays "pe-" (no
// change) only before l/m/n/r/w/y (pelari, peramal, pelukis); t-initial native
// roots drop the t — sites.google.com/site/bmalaysiatatabahasa/imbuhan/pe.
describe('grammar.js — peN- allomorph table content truth', () => {
  const wordsByRule = (prefix) =>
    GRAMMAR_RULES[prefix].rules.map((r) => r.example.split(',').map((w) => w.trim().toLowerCase()))

  it.each(['meN-', 'peN-'])(
    'never lists the same derived word under two different %s allomorph rules',
    (prefix) => {
      const lists = wordsByRule(prefix)
      const seen = new Map() // word -> first rule index it appeared under
      for (let i = 0; i < lists.length; i++) {
        for (const w of lists[i]) {
          expect(
            seen.has(w),
            `"${w}" appears under two ${prefix} rules (#${seen.get(w)} and #${i}) — each word has exactly one allomorph`,
          ).toBe(false)
          seen.set(w, i)
        }
      }
    },
  )

  it('lists "penulis" ONLY under the t-drop rule, never under "No change"', () => {
    const rules = GRAMMAR_RULES['peN-'].rules
    const noChange = rules.find((r) => r.note === 'No change')
    const tDrop = rules.find((r) => /T drops/.test(r.note))
    expect(noChange).toBeDefined()
    expect(tDrop).toBeDefined()
    // tulis is t-initial → t drops → penulis. It must NOT sit in the "No change" group.
    expect(noChange.example).not.toMatch(/penulis/)
    expect(tDrop.example).toMatch(/penulis/)
  })

  it('the peN- "No change" group shows a genuine no-change form (peramal, pe- + ramal)', () => {
    const noChange = GRAMMAR_RULES['peN-'].rules.find((r) => r.note === 'No change')
    expect(noChange.example).toMatch(/peramal/)
    expect(noChange.example).toMatch(/pelukis/) // unchanged anchor
  })
})

// The ber- prefix reduces to be- before an R-INITIAL root: the prefix's own r
// drops to avoid "berr-" (ber- + rasa → berasa, ber- + rehat → berehat). So
// "berasa" (to feel) derives from root RASA — NOT the obscure word "asa" (hope,
// as in "putus asa"). The drill once taught root:'asa' / rule:'ber- + asa →
// berasa', which (a) mis-taught the morphology and (b) contradicted
// GRAMMAR_RULES['ber-'], which (correctly) files berasa under the be-/r-initial
// rule. `drill.rule` is shown to the student (Grammar.jsx) AND keys the
// elaborative feedback, so a wrong rule is a confident-wrong lesson.
//
// Web-verified: ber- → be- before an r-initial root (berasa = be- + rasa,
// berenang, berehat) — awalmulamy.blogspot.com/2021/02/perkataan-bermula-huruf-ber,
// malaytuitionsg.com/fungsi-kata-imbuhan-ber.
describe('grammar.js — ber- be-/r-initial allomorph content truth', () => {
  it('teaches "berasa" from root "rasa" (ber- + rasa → be- reduction), not "asa"', () => {
    const berasa = IMBUHAN_DRILLS.find((d) => d.id === 'prefix-ber-asa')
    expect(berasa).toBeDefined()
    expect(berasa.answer).toBe('berasa') // answer key unchanged
    expect(berasa.root).toBe('rasa') // was wrongly 'asa'
    expect(berasa.rule).toBe('be- + r → r drops')
    expect(berasa.hint).toMatch(/rasa/)
  })

  it('GRAMMAR_RULES ber- r-initial example is not garbled and lists real be- forms', () => {
    const row = GRAMMAR_RULES['ber-'].rules.find((r) => /r-initial/.test(r.pattern))
    expect(row).toBeDefined()
    expect(row.example).not.toMatch(/berasa → berasa/) // the meaningless self-arrow
    expect(row.example).toMatch(/berasa/)
    expect(row.example).toMatch(/bekerja/) // unchanged anchor
  })

  it('the berasa drill rule resolves to a real GRAMMAR_FEEDBACK entry (grounded feedback)', () => {
    const berasa = IMBUHAN_DRILLS.find((d) => d.id === 'prefix-ber-asa')
    const entry = GRAMMAR_FEEDBACK[berasa.rule]
    expect(entry).toBeDefined()
    expect(entry.examples.some((e) => e.result === 'berasa')).toBe(true)
  })
})
