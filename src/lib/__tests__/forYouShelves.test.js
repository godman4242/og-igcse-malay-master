import { describe, it, expect } from 'vitest'
import { buildForYouShelves, SHELF_ORDER } from '../forYouShelves.js'
import { State } from '../fsrs.js'

const DAY = 86400000
const NOW = new Date('2026-06-06T12:00:00Z').getTime()

// A card that qualifies for "Still remember these?" under the defaults.
function settledCard(over = {}) {
  return {
    m: 'settled', e: 'settled-en', t: 'Topic', state: State.Review, stability: 40,
    last_review: new Date(NOW - 20 * DAY).toISOString(),
    due: new Date(NOW + 10 * DAY).toISOString(),
    ...over,
  }
}

// Minimal "everything off" snapshot — a brand-new learner.
function emptySnapshot(over = {}) {
  return {
    cards: [],
    mistakes: [],
    confidenceLog: [],
    writingHistory: [],
    studyHistory: {},
    speakingHistory: [],
    identity: { idealSelf: '', goalPreset: null },
    recallProbe: { enabled: true, stabilityDays: 21, idleDays: 14 },
    dailyPlanInputs: { cards: [] },
    lang: 'ms',
    ...over,
  }
}

function byId(shelves, id) {
  return shelves.find(s => s.id === id)
}

describe('buildForYouShelves', () => {
  it('hides every shelf for a brand-new learner', () => {
    const shelves = buildForYouShelves(emptySnapshot(), NOW)
    expect(shelves.every(s => s.hidden)).toBe(true)
  })

  it('returns shelves in the locked order', () => {
    const shelves = buildForYouShelves(emptySnapshot(), NOW)
    expect(shelves.map(s => s.id)).toEqual(SHELF_ORDER)
    expect(SHELF_ORDER).toEqual(['keep-going', 'picked', 'still-remember', 'saved', 'goal'])
  })

  it('"keep going" surfaces undone tasks from the daily plan', () => {
    const snap = emptySnapshot({
      dailyPlanInputs: { cards: [settledCard({ last_review: null })], dueCount: 3 },
    })
    const shelf = byId(buildForYouShelves(snap, NOW), 'keep-going')
    expect(shelf.hidden).toBe(false)
    expect(shelf.items.length).toBeGreaterThan(0)
    expect(shelf.items[0].route).toBeTruthy()
  })

  it('"picked for you" shows whenever the deck has cards and launches a smart session', () => {
    const snap = emptySnapshot({ cards: [settledCard()] })
    const shelf = byId(buildForYouShelves(snap, NOW), 'picked')
    expect(shelf.hidden).toBe(false)
    expect(shelf.cta.route).toBe('/smart-study')
  })

  it('"picked for you" surfaces the learner\'s weak categories in meta', () => {
    const snap = emptySnapshot({
      cards: [settledCard()],
      mistakes: [
        { category: 'imbuhan', severity: 'high', language: 'ms', timestamp: Date.now() - DAY, surface: 'memakan' },
        { category: 'tense', severity: 'med', language: 'ms', timestamp: Date.now() - DAY },
      ],
    })
    const shelf = byId(buildForYouShelves(snap, NOW), 'picked')
    expect(shelf.meta.focusTopics.length).toBeGreaterThan(0)
    // Every chip is human-readable — its label is mapped, never the raw category key.
    expect(shelf.items.length).toBe(shelf.meta.focusTopics.length)
    expect(shelf.items.every(i => i.label && i.label !== i.id)).toBe(true)
  })

  it('"still remember these?" surfaces settled-but-idle cards, and hides when disabled', () => {
    const snap = emptySnapshot({ cards: [settledCard()] })
    const on = byId(buildForYouShelves(snap, NOW), 'still-remember')
    expect(on.hidden).toBe(false)
    expect(on.items[0].m).toBe('settled')

    const offSnap = emptySnapshot({
      cards: [settledCard()],
      recallProbe: { enabled: false, stabilityDays: 21, idleDays: 14 },
    })
    expect(byId(buildForYouShelves(offSnap, NOW), 'still-remember').hidden).toBe(true)
  })

  it('"from your saved words" surfaces the Saved deck and links to /saved-cloze', () => {
    const snap = emptySnapshot({
      cards: [{ m: 'kucing', e: 'cat', t: 'Saved' }, settledCard()],
    })
    const shelf = byId(buildForYouShelves(snap, NOW), 'saved')
    expect(shelf.hidden).toBe(false)
    expect(shelf.items).toHaveLength(1)
    expect(shelf.items[0].m).toBe('kucing')
    expect(shelf.cta.route).toBe('/saved-cloze')
  })

  it('"toward your goal" maps a preset to its surface, and hides without a goal', () => {
    const speak = emptySnapshot({ identity: { idealSelf: '', goalPreset: 'speak' } })
    const shelf = byId(buildForYouShelves(speak, NOW), 'goal')
    expect(shelf.hidden).toBe(false)
    expect(shelf.cta.route).toBe('/speaking')

    expect(byId(buildForYouShelves(emptySnapshot(), NOW), 'goal').hidden).toBe(true)
  })

  it('"toward your goal" works off a free-text sentence when no preset is set', () => {
    const snap = emptySnapshot({ identity: { idealSelf: 'I want to write better essays', goalPreset: null } })
    const shelf = byId(buildForYouShelves(snap, NOW), 'goal')
    expect(shelf.hidden).toBe(false)
    expect(shelf.cta.route).toBe('/writing')
  })

  it('never throws on a wholly empty / garbage snapshot', () => {
    expect(() => buildForYouShelves(undefined, NOW)).not.toThrow()
    expect(() => buildForYouShelves({}, NOW)).not.toThrow()
    const shelves = buildForYouShelves({}, NOW)
    expect(shelves.map(s => s.id)).toEqual(SHELF_ORDER)
    expect(shelves.every(s => s.hidden)).toBe(true)
  })
})
