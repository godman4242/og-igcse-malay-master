// @vitest-environment jsdom
//
// The Dashboard "Mastered: N" tile opens this panel (workflow audit #7 — the
// tile used to silently jump into the due-review session). The list must show
// exactly the mastered cards (same predicate as the tile's count) with glosses,
// an empty state, and a working close.
//
// Mount harness mirrors produceMode.test.js (createRoot + act).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import MasteredWordsModal from '../MasteredWordsModal'
import { State } from '../../../lib/fsrs'

let host, root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})
const render = async (el) => act(async () => root.render(el))

const mastered = (m, e) => ({ m, e, state: State.Review, stability: 50 })
const learning = (m, e) => ({ m, e, state: State.Review, stability: 3 })

describe('MasteredWordsModal', () => {
  it('lists only mastered words with their glosses', async () => {
    const cards = [mastered('rumah', 'house'), learning('baru', 'new'), mastered('makan', 'eat')]
    await render(React.createElement(MasteredWordsModal, { cards, onClose: () => {} }))
    const text = document.body.textContent
    expect(text).toContain('rumah')
    expect(text).toContain('house')
    expect(text).toContain('makan')
    expect(text).not.toContain('baru') // learning card excluded
  })

  it('shows an empty state when nothing is mastered', async () => {
    await render(React.createElement(MasteredWordsModal, { cards: [learning('baru', 'new')], onClose: () => {} }))
    expect(document.body.textContent).toMatch(/No mastered words yet/i)
  })

  it('calls onClose when the close button is clicked', async () => {
    let closed = false
    await render(React.createElement(MasteredWordsModal, { cards: [], onClose: () => { closed = true } }))
    const btn = document.querySelector('button[aria-label="Close"]')
    await act(async () => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(closed).toBe(true)
  })
})
