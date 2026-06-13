// Feature #6 — retire XP. The abstract engagementXP counter was the one
// surface serving no learning-science principle (2026-06-12 review): points
// reliably raise activity quantity, not learning quality (Mekler et al. 2017),
// and controlling rewards risk undermining intrinsic motivation (SDT). The
// Dashboard tile becomes "Mastered" (countMastered in lib/fsrs.js); challenge
// completion keeps its confirmation moment without the number.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore, { STORE_VERSION } from '../useStore'

describe('XP retirement (v32)', () => {
  beforeEach(() => {
    useStore.setState({
      dailyChallenge: null,
      challengeHistory: {},
      triggerCloudSync: () => {},
    })
  })

  it('STORE_VERSION is at least 32', () => {
    expect(STORE_VERSION).toBeGreaterThanOrEqual(32)
  })

  it('the store no longer carries an engagementXP field', () => {
    expect('engagementXP' in useStore.getInitialState()).toBe(false)
  })

  it('completing the daily challenge marks it complete WITHOUT awarding XP', () => {
    useStore.setState({
      dailyChallenge: {
        date: '2026-06-13', mode: 'normal',
        reviewTarget: 1, grammarTarget: 0,
        reviewDone: 0, grammarDone: 0, completedAt: null,
      },
    })
    useStore.getState().updateChallengeProgress('review')
    const s = useStore.getState()
    expect(s.dailyChallenge.completedAt).toBeTruthy()
    expect(s.challengeHistory['2026-06-13']).toBeTruthy()
    expect(s.engagementXP).toBeUndefined()
  })

  it('export no longer includes engagementXP (old backups import without it)', () => {
    const backup = useStore.getState().exportData()
    expect('engagementXP' in backup).toBe(false)
  })
})
