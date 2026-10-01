// A6 Phase 1 step 1 — the header's ← → greying. React Router stamps every
// history entry with `history.state.idx`; the helper derives "anything back /
// ahead" from that index + the highest index seen this tab (sessionStorage).
import { describe, it, expect } from 'vitest'
import { readNavState } from '../historyNav.js'

describe('readNavState', () => {
  it('fresh visit: nothing back, nothing ahead', () => {
    const s = readNavState({ idx: 0 }, null, 'POP', 'navigate')
    expect(s).toMatchObject({ idx: 0, max: 0, canBack: false, canForward: false })
  })

  it('after a push: back only', () => {
    expect(readNavState({ idx: 1 }, '0', 'PUSH')).toMatchObject({ max: 1, canBack: true, canForward: false })
  })

  it('after ←: forward lights up, back greys at the bottom of the stack', () => {
    expect(readNavState({ idx: 0 }, '1', 'POP')).toMatchObject({ max: 1, canBack: false, canForward: true })
  })

  it('a push from the middle of the stack drops the forward entries', () => {
    expect(readNavState({ idx: 1 }, '3', 'PUSH')).toMatchObject({ max: 1, canForward: false })
  })

  it('a replace keeps the forward entries', () => {
    expect(readNavState({ idx: 1 }, '3', 'REPLACE')).toMatchObject({ max: 3, canForward: true })
  })

  it('reload keeps the forward entries; a typed URL in a used tab does not', () => {
    expect(readNavState({ idx: 0 }, '2', 'POP', 'reload').canForward).toBe(true)
    expect(readNavState({ idx: 0 }, '2', 'POP', 'back_forward').canForward).toBe(true)
    expect(readNavState({ idx: 0 }, '4', 'POP', 'navigate').canForward).toBe(false)
  })

  it('tolerates a null history state and garbage storage', () => {
    expect(readNavState(null, 'nope', 'POP')).toMatchObject({ idx: 0, max: 0, canBack: false, canForward: false })
    expect(readNavState({ idx: 'x' }, undefined, 'POP').idx).toBe(0)
  })
})
