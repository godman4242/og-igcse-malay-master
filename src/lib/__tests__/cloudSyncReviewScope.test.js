// P2-C1 (cloud path): a synced review must update ONLY the studied deck's copy.
// processCloudSyncEvent('card_reviewed') filtered the local cards by word alone
// (`c.m === payload.malay`), so a word in two decks pushed BOTH rows to
// user_cards on every review — the same word-only bug as reviewCardAction, one
// layer down. Fix: thread `deck` through the payload + scope the filter by
// `c.m === malay && c.t === deck`.

import { describe, it, expect, beforeEach, vi } from 'vitest'

const upserted = []
const fakeClient = {
  from: () => ({
    upsert: async (rows) => { upserted.push(...rows); return { error: null } },
  }),
}

vi.mock('../../config/supabase', () => ({
  initSupabase: vi.fn(async () => fakeClient),
  getCurrentUser: vi.fn(async () => ({ id: 'user-1' })),
  upsertUserProfile: vi.fn(async () => true),
}))

import { processCloudSyncEvent } from '../cloudSync'

function card(t) {
  return { m: 'rumah', e: 'house', t, stability: 1, due: '2026-01-01T00:00:00.000Z' }
}

describe('processCloudSyncEvent card_reviewed — deck-scoped upsert (P2-C1)', () => {
  beforeEach(() => { upserted.length = 0 })

  it('upserts only the studied m::t copy, not every deck holding the word', async () => {
    const state = { cards: [card('DeckA'), card('DeckB')] }
    const event = { type: 'card_reviewed', payload: { malay: 'rumah', deck: 'DeckA', rating: 3 } }

    await processCloudSyncEvent(event, state)

    expect(upserted).toHaveLength(1)
    expect(upserted[0].card.t).toBe('DeckA')
  })
})
