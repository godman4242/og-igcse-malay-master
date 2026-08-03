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
import { IMBUHAN_DRILLS, GRAMMAR_RULES, TRANSFORM_DRILLS, ERROR_DRILLS } from '../grammar'
import { GRAMMAR_FEEDBACK } from '../feedbackRules'
import { SVA_DRILLS_EN } from '../grammarEng'

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

// ber- reduces to be- for TWO DISTINCT reasons — the drill data once conflated
// them, mislabeling the second as the first:
//   (1) r-INITIAL root: the prefix's own r drops to avoid "berr-" — rasa→berasa,
//       renang→berenang, rehat→berehat.
//   (2) "er"-FIRST-SYLLABLE root: ber- becomes be- when the root's first syllable
//       already carries an "er" (pepet) sound — ker-ja → bekerja. This is NOT
//       about an r-initial root (kerja is k-initial) and there is no double r to
//       avoid; the older "be- + kerja (r-initial syllable)" / "Avoids ber-r"
//       label taught the wrong reason (confident-wrong — `drill.rule` is shown to
//       the student in Grammar.jsx AND keys the elaborative GRAMMAR_FEEDBACK).
// "berasa" (to feel) also derives from root RASA — NOT the obscure word "asa".
//
// Web-verified: rule (1) r-initial → berasa/berenang/berehat
// (malaytuitionsg.com/fungsi-kata-imbuhan-ber); rule (2) first syllable ends in
// "-er" → kerja→bekerja (Ivan Lanin/KBBI: ker-ja→bekerja, distinct rule).
// MALAY-specific: kerja→bekerja is the lone clean Malay example — Indonesian
// forms like beternak/becermin/bepergian are NOT standard Malay (DBP: menternak,
// bercermin), so they are deliberately excluded as examples.
describe('grammar.js — ber- be- allomorph content truth (r-initial vs "er" first syllable)', () => {
  it('teaches "berasa" from root "rasa" (ber- + rasa → be- reduction), not "asa"', () => {
    const berasa = IMBUHAN_DRILLS.find((d) => d.id === 'prefix-ber-asa')
    expect(berasa).toBeDefined()
    expect(berasa.answer).toBe('berasa') // answer key unchanged
    expect(berasa.root).toBe('rasa') // was wrongly 'asa'
    expect(berasa.rule).toBe('be- + r → r drops')
    expect(berasa.hint).toMatch(/rasa/)
  })

  it('files bekerja under the "er first-syllable" rule, NOT the r-initial (double-r) rule', () => {
    const rows = GRAMMAR_RULES['ber-'].rules
    const rInitial = rows.find((r) => /r-initial/i.test(r.pattern))
    const erRow = rows.find((r) => /first syllable/i.test(r.pattern))
    expect(rInitial, 'distinct r-initial rule row').toBeDefined()
    expect(erRow, 'distinct "er" first-syllable rule row').toBeDefined()
    expect(rInitial).not.toBe(erRow) // the two rules are no longer conflated
    // r-initial rule: genuine r-initial roots only (rasa→berasa, renang→berenang)
    expect(rInitial.example).toMatch(/berasa/)
    expect(rInitial.example).toMatch(/berenang/)
    expect(rInitial.example, 'kerja is k-initial — must not sit under the r-initial rule').not.toMatch(/bekerja/)
    // "er" first-syllable rule: bekerja lives here, and it is not mislabeled r-initial
    expect(erRow.example).toMatch(/bekerja/)
    expect(`${erRow.pattern} ${erRow.note}`).not.toMatch(/r-initial/i)
  })

  it('explains error-berkerja by the "er" first syllable, not a false "r-initial" claim', () => {
    const drill = ERROR_DRILLS.find((d) => d.id === 'error-berkerja')
    expect(drill).toBeDefined()
    expect(drill.correction).toBe('bekerja') // answer key unchanged
    expect(drill.explanation).not.toMatch(/r-initial/i) // kerja is k-initial
    expect(drill.explanation).toMatch(/first syllable/i) // names the real reason
  })

  it('the bekerja drill rule label is not "r-initial" and still keys grounded feedback', () => {
    const drill = IMBUHAN_DRILLS.find((d) => d.id === 'prefix-ber-kerja')
    expect(drill).toBeDefined()
    expect(drill.answer).toBe('bekerja') // answer key unchanged
    expect(drill.rule).not.toMatch(/r-initial/i) // displayed to the student
    // the rule string is the join key into GRAMMAR_FEEDBACK — keep it resolving
    const entry = GRAMMAR_FEEDBACK[drill.rule]
    expect(entry, `feedback for "${drill.rule}"`).toBeDefined()
    expect(entry.examples.some((e) => e.result === 'bekerja')).toBe(true)
    expect(`${entry.explanation} ${entry.mnemonic}`).not.toMatch(/r-initial/i)
  })

  it('the berasa drill rule resolves to a real GRAMMAR_FEEDBACK entry (grounded feedback)', () => {
    const berasa = IMBUHAN_DRILLS.find((d) => d.id === 'prefix-ber-asa')
    const entry = GRAMMAR_FEEDBACK[berasa.rule]
    expect(entry).toBeDefined()
    expect(entry.examples.some((e) => e.result === 'berasa')).toBe(true)
  })
})

// A ke-...-an "convert verb → place noun" transform drill is a MORPHOLOGY
// exercise: the student is shown a root and must affix it. So the prompted root
// must be the one the answer actually derives from — same invariant the
// prefix-ber-asa fix enforces (prompt root ≡ the answer's true root).
//
// "kediaman" = ke- + DIAM + -an (DBP "diam II" = tinggal/menetap di = to reside;
// kediaman is explicitly its noun form = tempat tinggal). The ke-...-an form of
// "tinggal" is "KETINGGALAN" (= tertinggal / left behind) — NOT a place noun.
// So prompting root "tinggal" for answer "kediaman" taught a FALSE derivation,
// and a student who correctly applied ke-...-an to the given root would produce
// "ketinggalan" and be marked wrong. Fixed by prompting the true root "diam"
// (answer/hint/instruction already correct).
//
// Web-verified: kediaman = ke-+diam+-an / tempat tinggal, diam II = to reside —
// kamusbm.com/diam-ii, dewanbahasa.jendeladbp.my (imbuhan ke-...-an);
// ketinggalan = ke-+tinggal+-an = left behind — id.wiktionary.org/wiki/ketinggalan.
describe('grammar.js — noun-form transform drill root/derivation consistency', () => {
  it('prompts the TRUE root of "kediaman" (diam), not "tinggal" (whose ke-…-an is ketinggalan)', () => {
    const drill = TRANSFORM_DRILLS.find((d) => d.id === 'transform-noun-tinggal')
    expect(drill).toBeDefined()
    expect(drill.answer).toBe('kediaman') // answer key unchanged
    expect(drill.sentence).toBe('diam') // was wrongly 'tinggal'
    expect(drill.hint).toMatch(/diam/) // hint already names the true root
  })
})

// The "find the error" drill error-mencomel teaches a student NOT to bolt meN-
// onto an adjective that is merely describing a noun ("kucing yang comel" = a
// cute cat). The ANSWER (error = "mencomel", correction = "comel") is right, but
// the old explanation gave TWO confident-WRONG reasons:
//   (1) "an adjective does not take the meN- prefix" — false: adjectives DO take
//       meN- to mean "become X" — besar → membesar = "menjadi besar; bertambah
//       besar" (DBP PRPM, Kamus Pelajar). The real rule is "comel here is just
//       describing the cat, so it stays bare", NOT "adjectives never take meN-".
//   (2) "Mencomel is not a valid word" — false: "mencomel" IS a real DBP entry
//       (Kamus Dewan Edisi Keempat: "merungut, mengomel" = to mutter/grumble), a
//       homonym from a different sense of comel — just not the meaning ("cute")
//       the sentence wants. The app's own malayValidityList.js even lists it.
// Same confident-wrong-REASON class as the ber-kerja fix: the answer is right,
// the taught reason was wrong. error.explanation is shown to the student in
// Grammar.jsx (errorFb.explanation), so a wrong reason mis-teaches.
//
// Web-verified: membesar = "menjadi besar; bertambah besar" (prpm.dbp.gov.my,
// Kamus Pelajar Edisi Kedua); mencomel = "merungut, mengomel" (prpm.dbp.gov.my,
// Kamus Dewan Edisi Keempat).
describe('grammar.js — error-mencomel explanation content truth', () => {
  const drill = ERROR_DRILLS.find((d) => d.id === 'error-mencomel')

  it('keeps the answer key (error "mencomel" → correction "comel")', () => {
    expect(drill).toBeDefined()
    expect(drill.answer).toBe('mencomel')
    expect(drill.correction).toBe('comel')
  })

  it('drops the two confident-wrong claims (the false blanket rule + "not a valid word")', () => {
    // adjectives DO take meN- (besar → membesar) — never claim they cannot
    expect(drill.explanation).not.toMatch(/does not take the meN-/i)
    // "mencomel" IS a real DBP word (to grumble) — never claim it is invalid
    expect(drill.explanation).not.toMatch(/not a valid word/i)
  })

  it('teaches the correct reason: comel stays bare here, and cites a real meN- adjective', () => {
    expect(drill.explanation).toMatch(/comel/) // the correct bare form to use
    expect(drill.explanation).toMatch(/membesar/) // grounded proof adjectives CAN take meN-
  })
})

// The ber- → bel- allomorph is LEXICALLY restricted to TWO roots, not one:
//   ber- + ajar  → belajar  (to study/learn)   — common
//   ber- + unjur → belunjur (to sit with the legs stretched forward) — rare
// The feedback for the belajar drill once asserted "belajar is the ONE exception"
// and "Only ajar has this irregular form" — confident-WRONG, because belunjur is a
// standard Kamus Dewan word formed by the exact same ber-→bel- reduction. The
// mnemonic + relatedRule render to the student (they key off the drill's `rule`
// string in Grammar.jsx), so a false exclusivity claim mis-teaches — same
// confident-wrong-REASON class as the ber-kerja and error-mencomel fixes.
//
// Web-verified: ber-+ajar→belajar AND ber-+unjur→belunjur are the two bel- forms
// (azam09.blogspot.com/2009/09/imbuhan-ber.html; bahasamelayuonline.com/tatabahasa/imbuhan);
// belunjur = "meluruskan kaki ke depan ketika duduk" (kamusbm.com/belunjur, Kamus Dewan).
describe('feedbackRules.js — bel- (belajar) irregular: no false "only ajar" exclusivity claim', () => {
  const entry = GRAMMAR_FEEDBACK['bel- + ajar (irregular)']

  it('still resolves the join key from the prefix-ber-ajar drill (belajar anchor intact)', () => {
    expect(entry).toBeDefined()
    const drill = IMBUHAN_DRILLS.find((d) => d.id === 'prefix-ber-ajar')
    expect(drill.rule).toBe('bel- + ajar (irregular)') // join key unchanged
    expect(GRAMMAR_FEEDBACK[drill.rule]).toBe(entry)
    expect(entry.examples.some((e) => e.result === 'belajar')).toBe(true) // example unchanged
  })

  it('drops the confident-wrong exclusivity claim (belunjur is a real second bel- form)', () => {
    const text = `${entry.mnemonic} ${entry.relatedRule}`
    expect(text, 'no false "the ONE exception"').not.toMatch(/one exception/i)
    expect(text, 'no false "only ajar"').not.toMatch(/only ajar/i)
  })

  it('acknowledges the second bel- root (unjur → belunjur) so the rule is complete', () => {
    const text = `${entry.mnemonic} ${entry.relatedRule}`
    expect(text).toMatch(/unjur/i) // names belunjur as the second standard case
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Collective-noun agreement is VARIABLE in British English, so an SVA drill
// must not key one form and mark the other wrong.
//
// `eng-sva-team` asked "The team ___ been training hard for the final." with
// both `have` and `has` on offer, keyed `has`, and told the learner the British
// convention requires the singular. Cambridge's own grammar and its ELT article
// "My Team is Winning (or are They?)" both say the opposite for this shape:
// with `team`, plural verbs are MORE common in British English, and "the team
// have been training" is standard. Training is done BY the members, which is
// exactly the reading that takes the plural. So a learner on a British syllabus
// (0500/0510) who picked the more idiomatic British form was marked wrong.
//
// The app already knew this and contradicted itself: writingErrors.js:1180
// deliberately exempts collective plural agreement — "collective 'this/that
// NOUN are' is valid British usage" — so the WRITING grader permits precisely
// what the DRILL penalised.
//
// The invariant below is the general one. A collective noun sitting directly
// in front of the blank, with both the singular and plural of one verb on
// offer, needs a co-reference cue (its / itself / their / themselves) to make
// exactly one answer defensible. Without it the key is arbitrary.
const COLLECTIVE_SUBJECT = /\b(?:the\s+)?(?:team|committee|family|government|staff|jury|crew|council|class|band)\s+___/i
const DISAMBIGUATOR = /\b(?:its|itself|their|themselves)\b/i
const NUMBER_PAIRS = [
  ['has', 'have'], ['is', 'are'], ['was', 'were'], ['does', 'do'],
  ['publishes', 'publish'], ['wants', 'want'], ['meets', 'meet'],
]

describe('English SVA drills — a collective-noun item must have one defensible answer', () => {
  it('never offers both numbers of a verb after a bare collective subject', () => {
    const offenders = []
    for (const d of SVA_DRILLS_EN) {
      if (!COLLECTIVE_SUBJECT.test(d.sentence)) continue
      const opts = d.options.map(o => o.toLowerCase())
      const bothNumbers = NUMBER_PAIRS.some(([sg, pl]) =>
        opts.some(o => o.split(/\s+/).includes(sg)) && opts.some(o => o.split(/\s+/).includes(pl)))
      if (bothNumbers && !DISAMBIGUATOR.test(d.sentence)) {
        offenders.push(`${d.id}: "${d.sentence}" options=${JSON.stringify(d.options)} answer=${JSON.stringify(d.answer)}`)
      }
    }
    expect(offenders, 'both British forms are defensible here, so the keyed answer is arbitrary').toEqual([])
  })

  it('does not tell the learner British English REQUIRES the singular', () => {
    for (const d of SVA_DRILLS_EN) {
      expect(d.rule || '', `${d.id} rule`).not.toMatch(/British.*(?:convention|English).*(?:take|takes|requires?)\s+a\s+singular/i)
    }
  })

  it('eng-sva-team still teaches collective nouns, and its answer is forced by a pronoun', () => {
    const d = SVA_DRILLS_EN.find(x => x.id === 'eng-sva-team')
    expect(d, 'the drill id must survive — grammarCards FSRS state is keyed by it').toBeTruthy()
    expect(d.sentence).toMatch(COLLECTIVE_SUBJECT)
    expect(d.sentence).toMatch(DISAMBIGUATOR)
    expect(d.options).toContain(d.answer)
    // The rule must state the variability, not deny it.
    expect(d.rule).toMatch(/\bboth\b/i)
  })
})
