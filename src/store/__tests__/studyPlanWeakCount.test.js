// 2026-09-28 bug hunt, GOAL #34: one weak card made the Dashboard's study plan
// say "1 cards need attention".
import { it, expect } from 'vitest'
import useStore from '../useStore'

const inDays = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

it.each([[1, '1 card needs attention'], [2, '2 cards need attention']])('%i weak card(s) → "%s"', (n, phrase) => {
  useStore.setState({
    examDate: inDays(20), grammarCards: {},
    cards: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, m: `kata${i}`, e: 'x', t: 'Food', state: 0 })),
  })
  expect(useStore.getState().getStudyPlan().recommendation).toBe(`Strengthen weak areas. ${phrase} — especially Food.`)
})
