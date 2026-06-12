// getHypercorrectionTargets — the calibration-loop selector ("You were sure,
// but…" panel + smart-study boost both consume it, so its contract is pinned
// here): certain-but-wrong confidence entries, deduped, most-recent-first,
// scoped to an optional sinceTs (defaults to the last 14 days).

import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../useStore'

const DAY = 24 * 60 * 60 * 1000

const entry = (word, { level = 3, correct = false, ts = Date.now() } = {}) =>
  ({ word, level, correct, ts })

describe('getHypercorrectionTargets', () => {
  beforeEach(() => {
    useStore.setState({ confidenceLog: [] })
  })

  it('returns certain-but-wrong words from the last 14 days by default', () => {
    const now = Date.now()
    useStore.setState({
      confidenceLog: [
        entry('rumah', { ts: now - 1 * DAY }),                  // certain + wrong → in
        entry('makan', { ts: now - 20 * DAY }),                 // too old → out
        entry('tidur', { level: 3, correct: true, ts: now }),   // certain + right → out
        entry('kerja', { level: 1, correct: false, ts: now }),  // unsure + wrong → out
      ],
    })
    expect(useStore.getState().getHypercorrectionTargets()).toEqual(['rumah'])
  })

  it('scopes to sinceTs when given (session-window use)', () => {
    const sessionStart = Date.now() - 10 * 60 * 1000 // 10 min ago
    useStore.setState({
      confidenceLog: [
        entry('lama', { ts: sessionStart - DAY }),     // before this session → out
        entry('baru', { ts: sessionStart + 1000 }),    // during this session → in
      ],
    })
    expect(useStore.getState().getHypercorrectionTargets(sessionStart)).toEqual(['baru'])
  })

  it('dedupes repeated words, most recent first', () => {
    const now = Date.now()
    useStore.setState({
      confidenceLog: [
        entry('rumah', { ts: now - 3 * DAY }),
        entry('makan', { ts: now - 2 * DAY }),
        entry('rumah', { ts: now - 1 * DAY }), // repeat — keep one, ranked by THIS ts
      ],
    })
    expect(useStore.getState().getHypercorrectionTargets()).toEqual(['rumah', 'makan'])
  })
})
