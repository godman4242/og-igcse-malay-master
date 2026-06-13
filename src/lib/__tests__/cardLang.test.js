import { describe, it, expect } from 'vitest'
import { cardsForLang, LANGS } from '../cardLang'

const cards = [
  { m: 'abang', e: 'older brother', lang: 'ms' },
  { m: 'brother', e: 'abang', lang: 'en' },
  { m: 'rumah', e: 'house' },            // un-tagged (pre-v34) → treated as Malay
]

describe('cardsForLang', () => {
  it('returns only cards of the asked language', () => {
    expect(cardsForLang(cards, 'en').map(c => c.m)).toEqual(['brother'])
  })
  it('treats a missing lang as Malay (back-compat)', () => {
    expect(cardsForLang(cards, 'ms').map(c => c.m)).toEqual(['abang', 'rumah'])
  })
  it('non-array → []', () => { expect(cardsForLang(null, 'ms')).toEqual([]) })
  it('LANGS lists the two supported languages', () => {
    expect(LANGS).toEqual(['ms', 'en'])
  })
})
