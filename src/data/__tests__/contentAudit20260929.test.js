import { describe, it, expect } from 'vitest'
import DICTIONARY from '../dictionary'
import DICTIONARY_EN from '../dictionaryEn'
import WORD_FAMILIES from '../wordFamilies'

// Content-truth pins from the 2026-09-29 Malay audit. Every fix was checked
// against DBP's PRPM (Kamus Dewan / Kamus Pelajar), e.g.
// https://prpm.dbp.gov.my/cari1?keyword=hadapan — a wrong gloss here reaches a
// learner who can't tell it's wrong, so each one is pinned exactly.

describe('dictionary — main sense first, no misleading narrow glosses', () => {
  it.each([
    ['hadapan', 'front; (masa hadapan) future'], // di hadapan rumah ≠ "in the future of the house"
    ['alam', 'world; nature (alam sekitar = environment)'],
    ['daripada', 'from (a person/source); than; of (part of)'], // lebih besar daripada = bigger than
    ['lama', 'long (time); old (thing)'],
    ['jam', 'clock/watch; hour'],
    ['berhubung', 'connected; regarding (berhubung dengan); to communicate'],
    ['baru', 'new; just/recently'],
    ['percuma', 'free (of charge); in vain'],
    ['rusuk', 'side (of body); rib (tulang rusuk)'],
    ['kelmarin', 'the day before yesterday; (also) yesterday'],
    ['bulatan', 'circle; roundabout (road)'],
    ['tablet', 'tablet (pill; device)'],
  ])('%s = %s', (word, gloss) => {
    expect(DICTIONARY[word]).toBe(gloss)
  })
})

describe('dictionary — standard Malay spellings (DBP headwords)', () => {
  it.each([
    ['temuduga', 'temu duga', 'interview'],
    ['satay', 'sate', 'satay'],
    ['t-shirt', 'kemeja-T', 'T-shirt'],
    ['tidak dapat lupakan', 'tidak dapat melupakan', 'cannot forget'],
  ])('%s → %s', (wrong, right, gloss) => {
    expect(DICTIONARY).not.toHaveProperty([wrong])
    expect(DICTIONARY[right]).toBe(gloss)
  })

  it('the regenerated English seed points at the standard spellings', () => {
    expect(DICTIONARY_EN['interview']).toBe('temu duga')
    expect(DICTIONARY_EN['cannot forget']).toBe('tidak dapat melupakan')
    expect(Object.values(DICTIONARY_EN)).not.toContain('temuduga')
    expect(Object.values(DICTIONARY_EN)).not.toContain('tidak dapat lupakan')
  })
})

const forms = (root) => WORD_FAMILIES[root].forms
const form = (root, word) => forms(root).find(f => f.word === word)

describe('word families — derivations a learner can trust', () => {
  it('bangun: the root means rise/wake; "build" lives on membangunkan, not membangun', () => {
    expect(WORD_FAMILIES.bangun.meaning).toBe('rise/get up; wake up')
    expect(form('bangun', 'membangun').meaning).toBe('to rise; to develop (negara membangun)')
    expect(form('bangun', 'membangunkan').meaning).toBe('to wake (someone) up; to build; to develop (a country)')
    expect(form('bangun', 'dibangunkan').meaning).toBe('woken up; built/developed (passive)')
  })

  it('drops forms that are not derivations of the root (no DBP entry, or a different word)', () => {
    const words = (root) => forms(root).map(f => f.word)
    expect(words('masak')).not.toContain('termasak') // no PRPM entry
    expect(words('kerja')).not.toContain('kerjaya') // own headword; Malay has no "-ya" affix
    expect(words('tanya')).not.toContain('soal') // a separate root, not derived from tanya
    expect(words('siar')).not.toContain('bersiar-siar') // siar II (stroll) ≠ siar I (broadcast)
  })

  it('labels pe- forms as pe-, not peN- (pengerja / pengerjaan are the peN- forms)', () => {
    expect(form('kerja', 'pekerja').type).toBe('pe-')
    expect(form('kerja', 'pekerjaan').type).toBe('pe-...-an')
    expect(form('jalan', 'pejalan kaki')).toMatchObject({ type: 'pe-', meaning: 'pedestrian' })
    expect(form('jalan', 'pejalan')).toBeUndefined()
  })

  it('glosses the everyday sense', () => {
    expect(form('latih', 'pelatih').meaning).toBe('trainee; trainer')
    expect(form('cari', 'mencarikan').meaning).toBe('to look for (something) for someone')
    expect(form('tahu', 'ketahui').meaning).toBe('to know (seperti yang kita ketahui = as we know)')
  })
})
