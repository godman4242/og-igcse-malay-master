// Regression guard for the v34 lapse-language bug (adversarial review #7).
// reviewCardAction hardcoded language:'ms' for the mistake it journals on a
// 'Again' rating, so an English study lapse entered the MALAY mistake journal
// (wrong bucket + wrong Malay-stats attribution; and were it ever promoted, a
// wrong-direction card). The logged mistake must follow the card's own `lang`.
// (Study lapses are severity:'low' so they journal-only — auto-promotion is
// gated on severity !== 'low' — so this guards the journal bucket, the real bug.)

import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../useStore'
import { Rating } from '../../lib/fsrs'

const reset = () => useStore.setState(s => ({
  cards: [],
  mistakes: [],
  reviewedToday: 0,
  lastStudyDate: null,
  studyHistory: {},
  sync: { ...s.sync, queue: [] },
}))

describe('reviewCardAction — mistake language follows the card lang (#7)', () => {
  beforeEach(reset)

  it('journals an English card lapse as language:"en", not "ms"', () => {
    // A True-English-mode card: m = target English word, e = Malay gloss.
    useStore.setState({ cards: [{ m: 'weather', e: 'cuaca', t: 'English', lang: 'en' }] })

    useStore.getState().reviewCardAction('weather', 'English', Rating.Again)

    const mistake = useStore.getState().mistakes.find(m => m.word === 'weather')
    expect(mistake).toBeTruthy()
    expect(mistake.language).toBe('en')
  })

  it('still journals a Malay card lapse as language:"ms" (byte-identical Malay path)', () => {
    useStore.setState({ cards: [{ m: 'kucing', e: 'cat', t: 'Haiwan', lang: 'ms' }] })

    useStore.getState().reviewCardAction('kucing', 'Haiwan', Rating.Again)

    const mistake = useStore.getState().mistakes.find(m => m.word === 'kucing')
    expect(mistake.language).toBe('ms')
  })

  it('defaults to "ms" when a legacy card has no lang field', () => {
    useStore.setState({ cards: [{ m: 'rumah', e: 'house', t: 'Umum' }] }) // pre-v34 card, no lang

    useStore.getState().reviewCardAction('rumah', 'Umum', Rating.Again)

    const mistake = useStore.getState().mistakes.find(m => m.word === 'rumah')
    expect(mistake.language).toBe('ms')
  })
})
