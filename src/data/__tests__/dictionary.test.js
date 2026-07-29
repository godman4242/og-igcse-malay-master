import { describe, it, expect } from 'vitest'
import DICTIONARY from '../dictionary.js'
import DICTIONARY_EN from '../dictionaryEn.js'

// Content-truth (axis-1): `ijazah` = academic degree (the university qualification).
// "certificate" is a DIFFERENT word in Malay — `sijil` (e.g. Sijil Pelajaran Malaysia,
// sijil kelahiran = birth certificate). Web-verified vs Malay education authorities
// (iluminasi.com, unitar.my, weblogographic.com) 2026-06-21. The old gloss
// 'certificate/degree' taught the wrong synonym in the Malay->English direction.
describe('dictionary content-truth — ijazah', () => {
  it('glosses ijazah as an academic degree, not a certificate (certificate = sijil)', () => {
    expect(DICTIONARY['ijazah']).toBe('academic degree')
    expect(DICTIONARY['ijazah'].toLowerCase()).not.toContain('certificate')
  })

  it('the reversed English seed teaches "academic degree" -> ijazah (regen stayed in sync)', () => {
    // The old slash-gloss was dropped by the reversal (droppedSlash); the clean
    // 2-word gloss is now kept, so dictionaryEn.js must be regenerated in lock-step.
    expect(DICTIONARY_EN['academic degree']).toBe('ijazah')
  })
})

// Content-truth (axis-1): the baku spelling for noodles is `mi`, not `mee`.
// Surfaced 2026-07-29 while writing the `mee` example sentence. Two independent
// sources agree: (1) PRPM/Kamus Dewan has an entry for `mi` ("sj bahan makanan yg
// rupanya spt laksa tetapi biasanya berwarna kuning…") and NONE for `mee`, and DBP's
// own JendelaDBP column "Ejaan mi, mee, atau mie?" rules mee/mie incorrect;
// (2) the app's OWN Tier-2 Malay validity list (24,439 words, src/data/malayValidityList.js)
// contains `mi` and `mihun` but NOT `mee` — so the old headword was a word this app's
// spell-validity checker would itself reject. `mee` is ubiquitous on Malaysian menus,
// but IGCSE marks written baku, so the taught form must be `mi`.
describe('dictionary content-truth — mi (noodles)', () => {
  it('teaches the baku spelling `mi`, not `mee`', () => {
    expect(DICTIONARY['mi']).toBe('noodles')
    expect(DICTIONARY).not.toHaveProperty('mee')
  })

  it('the reversed English seed teaches "noodles" -> mi (regen stayed in sync)', () => {
    expect(DICTIONARY_EN['noodles']).toBe('mi')
  })
})

// Content-truth (axis-1): bare `masak` is STATIVE in Kamus Dewan — "cooked / ripe"
// (its listed senses are the food being done or the fruit being ripe, e.g. "nasi belum
// ~ lagi"). It has no transitive-verb sense; the ACT of cooking is `memasak`, which is
// already its own entry glossed "to cook". Surfaced 2026-07-29 by PRPM verification of
// the `masak` example sentence. The old gloss 'cook' collided with `memasak` and — via
// the reversed seed — taught an English learner `cook -> masak`, which is wrong.
describe('dictionary content-truth — masak vs memasak', () => {
  it('glosses bare masak as the stative cooked/ripe, not the act of cooking', () => {
    expect(DICTIONARY['masak']).toBe('cooked/ripe')
    expect(DICTIONARY['memasak']).toBe('to cook')
  })

  it('the reversed English seed no longer teaches "cook" -> masak', () => {
    // 'cooked/ripe' is a slash-gloss, which the reversal drops by design, so the
    // wrong English->Malay pair disappears; "to cook" -> memasak stays correct.
    expect(DICTIONARY_EN['cook']).toBeUndefined()
    expect(DICTIONARY_EN['to cook']).toBe('memasak')
  })
})
