// P1-1 — settings-only changes must NOT be silently reverted on a signed-in
// reload. Root cause: ~10 persisted-pref setters (setExamDate, toggleTheme,
// setDailyGoalLevel, markMistakeReviewed, identity setters, markGuideSeen, …)
// mutate state WITHOUT stamping `lastMutationAt` or kicking the debounced cloud
// blob push. So AuthGuard's newer-wins tie-break (cloudMs > localMs) sees the
// pre-change blob as "newer" and overwrites the local change on the next reload.
//
// Fix: every persisted-pref setter funnels through ONE helper
// (`commitPrefMutation`) that stamps `lastMutationAt` + calls `triggerCloudSync`.
// These are BEHAVIORAL tests of that contract (the store runs in node).
// See P1-1 in docs/reviews/2026-06-12-full-codebase-review.md.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../useStore'

const OLD_STAMP = '2020-01-01T00:00:00.000Z'

describe('P1-1 — persisted-pref setters stamp lastMutationAt + push', () => {
  let pushCalls

  beforeEach(() => {
    pushCalls = 0
    // Replace the debounced push with a counter so we can assert "scheduled a
    // push" without mocking the dynamic supabase import / 5s debounce.
    useStore.setState({
      triggerCloudSync: () => { pushCalls += 1 },
      lastMutationAt: OLD_STAMP,
      examDate: null,
    })
  })

  it('setExamDate advances lastMutationAt and schedules a cloud push', () => {
    useStore.getState().setExamDate('2026-12-01')

    expect(useStore.getState().examDate).toBe('2026-12-01')
    const localMs = new Date(useStore.getState().lastMutationAt).getTime()
    expect(localMs).toBeGreaterThan(new Date(OLD_STAMP).getTime())
    expect(pushCalls).toBe(1)
  })

  it('a settings-only change makes local newer than the pre-change cloud blob (tie-break keeps local)', () => {
    // Simulate the live bug end-to-end: the cloud blob was pushed at sign-in
    // (cloudUpdatedAt). Later the user changes ONLY the exam date and reviews no
    // card. On reload AuthGuard compares lastMutationAt vs the blob's
    // updated_at; with the stamp, local is newer → restoreFromCloud is NOT
    // chosen → the exam date survives.
    const cloudUpdatedAt = '2026-06-12T00:00:00.000Z'
    useStore.setState({ lastMutationAt: cloudUpdatedAt })

    useStore.getState().setExamDate('2026-12-01')

    const localMs = new Date(useStore.getState().lastMutationAt).getTime()
    const cloudMs = new Date(cloudUpdatedAt).getTime()
    expect(localMs).toBeGreaterThan(cloudMs) // local wins the tie-break
    expect(useStore.getState().examDate).toBe('2026-12-01')
  })

  it('the other named pref setters also stamp + push (theme, daily goal, mistake-reviewed, identity, guide)', () => {
    const cases = [
      () => useStore.getState().toggleTheme(),
      () => useStore.getState().setDailyGoalLevel('intensive'),
      () => useStore.getState().setIdentityLabel('a disciplined learner'),
      () => useStore.getState().setIdealSelf('fluent by exam day'),
      () => useStore.getState().setStudyCue('after dinner'),
    ]
    for (const mutate of cases) {
      pushCalls = 0
      useStore.setState({ lastMutationAt: OLD_STAMP })
      mutate()
      expect(new Date(useStore.getState().lastMutationAt).getTime())
        .toBeGreaterThan(new Date(OLD_STAMP).getTime())
      expect(pushCalls).toBe(1)
    }
  })

  it('markMistakeReviewed stamps + pushes when it actually changes a mistake', () => {
    useStore.setState({
      lastMutationAt: OLD_STAMP,
      mistakes: [{ id: 'm1', reviewed: false, word: 'sebab' }],
    })
    pushCalls = 0
    useStore.getState().markMistakeReviewed('m1')

    expect(useStore.getState().mistakes[0].reviewed).toBe(true)
    expect(new Date(useStore.getState().lastMutationAt).getTime())
      .toBeGreaterThan(new Date(OLD_STAMP).getTime())
    expect(pushCalls).toBe(1)
  })

  it('markGuideSeen("bogus") stays a no-op — no stamp, no push', () => {
    useStore.setState({
      lastMutationAt: OLD_STAMP,
      guide: { seenQuick: false, seenFull: false },
    })
    pushCalls = 0
    useStore.getState().markGuideSeen('bogus')

    expect(useStore.getState().guide).toEqual({ seenQuick: false, seenFull: false })
    expect(useStore.getState().lastMutationAt).toBe(OLD_STAMP) // unchanged
    expect(pushCalls).toBe(0)
  })

  it('markGuideSeen("quick") flips the flag and stamps + pushes', () => {
    useStore.setState({
      lastMutationAt: OLD_STAMP,
      guide: { seenQuick: false, seenFull: false },
    })
    pushCalls = 0
    useStore.getState().markGuideSeen('quick')

    expect(useStore.getState().guide).toEqual({ seenQuick: true, seenFull: false })
    expect(new Date(useStore.getState().lastMutationAt).getTime())
      .toBeGreaterThan(new Date(OLD_STAMP).getTime())
    expect(pushCalls).toBe(1)
  })
})
