import { describe, it, expect } from 'vitest'
import { blankInExample } from '../blankWord'

describe('blankInExample — whole-word cloze blanking', () => {
  // The real defect: the FREE Academic English 2 card { m:'compute',
  // ex:'Computers can compute huge sums in seconds.' } blanked mid-"Computers"
  // with the naive substring replace, leaking the answer.
  it('blanks the whole word, never a substring of a longer word (the compute/Computers leak)', () => {
    expect(blankInExample('Computers can compute huge sums in seconds.', 'compute')).toBe(
      'Computers can _____ huge sums in seconds.',
    )
  })

  it("does not blank a target that only appears inside a longer word ('ada' in 'kepada')", () => {
    expect(blankInExample('Saya pergi kepada guru.', 'ada')).toBe('Saya pergi kepada guru.')
  })

  it('blanks a whole-word occurrence even when a substring collision also exists', () => {
    expect(blankInExample('Ada makanan kepada kita.', 'ada')).toBe('_____ makanan kepada kita.')
  })

  it('blanks ALL whole-word occurrences (preserves the old g-flag multiplicity)', () => {
    expect(blankInExample('Rumah itu rumah besar.', 'rumah')).toBe('_____ itu _____ besar.')
  })

  it('is case-insensitive on the whole word', () => {
    expect(blankInExample('Rumah saya kecil.', 'rumah')).toBe('_____ saya kecil.')
  })

  it('matches a multi-word phrase as a unit', () => {
    expect(blankInExample('Telefon ialah alat komunikasi moden.', 'alat komunikasi')).toBe(
      'Telefon ialah _____ moden.',
    )
  })

  it('matches reduplication with a hyphen as a whole term', () => {
    expect(blankInExample('Kami suka jalan-jalan pagi.', 'jalan-jalan')).toBe(
      'Kami suka _____ pagi.',
    )
  })

  it('escapes regex-special characters in the word', () => {
    expect(blankInExample('Harga: a+b dalam kira.', 'a+b')).toBe('Harga: _____ dalam kira.')
  })

  it('accepts a custom blank token', () => {
    expect(blankInExample('Saya minum air.', 'air', '____')).toBe('Saya minum ____.')
  })

  it('guards non-string / empty input without throwing', () => {
    expect(blankInExample(undefined, 'air')).toBe('')
    expect(blankInExample('Saya minum air.', '')).toBe('Saya minum air.')
    expect(blankInExample('Saya minum air.', '   ')).toBe('Saya minum air.')
  })
})
