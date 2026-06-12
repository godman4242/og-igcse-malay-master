// P2-C2: card resurrection — the REVERSE of the obvious bug. fetchCloudCards
// already hides tombstones, so the sign-in pull never reads a deleted card.
// The resurrection is the device RE-PUSHING its still-local copy: device B holds
// X locally, B signs in, hydrateCloudData's snapshot push (upsertCloudCards)
// writes X with deleted:false and clobbers device A's tombstone — X re-appears
// everywhere.
//
// Fix (tombstone wins on sign-in): hydrateCloudData fetches the cloud tombstone
// set and, after the add-missing union, DROPS local cards whose m::t key is
// tombstoned — so B stops re-pushing them. A later explicit addCard re-clears
// the tombstone going forward (card_added → upsert deleted:false).

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../config/supabaseConfig', () => ({
  SUPABASE_CONFIG: { enabled: true, url: 'x', key: 'y' },
}))

// Injectable cloud state for the mocked data-access layer.
const cloud = { liveCards: [], deletedKeys: new Set(), pushed: null }

vi.mock('../../lib/cloudSync', () => ({
  fetchCloudCards: vi.fn(async () => cloud.liveCards),
  fetchCloudWritingHistory: vi.fn(async () => []),
  fetchCloudSpeakingHistory: vi.fn(async () => []),
  fetchCloudDeletedCardKeys: vi.fn(async () => cloud.deletedKeys),
  syncCloudSnapshot: vi.fn(async ({ cards }) => {
    cloud.pushed = cards
    return { cards: cards.length, writingEntries: 0, speakingEntries: 0 }
  }),
}))

import useStore from '../useStore'

function card(m, t) {
  return { m, e: m, t, stability: 1, due: '2026-01-01T00:00:00.000Z' }
}
const keysOf = (cards) => (cards || []).map(c => `${c.m}::${c.t || ''}`)

describe('hydrateCloudData — tombstone wins on sign-in (P2-C2)', () => {
  beforeEach(() => {
    cloud.liveCards = []
    cloud.deletedKeys = new Set()
    cloud.pushed = null
    useStore.setState({
      userRole: 'enhanced',
      cards: [],
      writingHistory: [],
      speakingHistory: [],
    })
  })

  it('drops a local card the cloud has tombstoned, and does not re-push it as live', async () => {
    // Device B still holds X locally (no local tombstone); cloud tombstoned X on A.
    useStore.setState({ cards: [card('rumah', 'Mistakes')] })
    cloud.liveCards = []
    cloud.deletedKeys = new Set(['rumah::Mistakes'])

    await useStore.getState().hydrateCloudData()

    // X stays deleted locally — not resurrected.
    expect(keysOf(useStore.getState().cards)).not.toContain('rumah::Mistakes')
    // And B must not re-push the tombstoned card as live (the resurrection path).
    expect(keysOf(cloud.pushed)).not.toContain('rumah::Mistakes')
  })

  it('still unions a cloud-LIVE card and preserves untouched local cards (no false deletion)', async () => {
    useStore.setState({ cards: [card('buku', '')] })   // local-only, live
    cloud.liveCards = [card('meja', 'Topic')]           // cloud-only, live
    cloud.deletedKeys = new Set(['ayam::Other'])        // tombstone targets a different card

    await useStore.getState().hydrateCloudData()

    const keys = keysOf(useStore.getState().cards)
    expect(keys).toContain('buku::')      // untouched local card preserved
    expect(keys).toContain('meja::Topic') // cloud-live card unioned in
  })
})
