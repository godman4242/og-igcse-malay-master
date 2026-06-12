// @vitest-environment jsdom
//
// P2-C10 regression: with Cram on, switching MS⇄EN must serve the NEW language's
// drills. The live bug: the cram decks are seeded by an effect that depends only
// on [cramMode], so switchLang() leaves the old-language shuffled deck in state
// (`sortedImbuhan = cramImbuhan || …` keeps the stale, truthy array). After a
// switch to English the drill tab feeds that stale Malay imbuhan item (which has
// no `options`) into the English MCQ card — wrong language, and it crashes.
//
// We wrap Grammar in an error boundary so the (buggy) crash becomes a clean
// "no English content rendered" assertion instead of a thrown error.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.hoisted(() => {
  const mem = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)) },
      removeItem: (k) => { mem.delete(k) },
      clear: () => { mem.clear() },
      key: (i) => [...mem.keys()][i] ?? null,
      get length() { return mem.size },
    },
  })
})

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import Grammar from '../Grammar'
import { CONFUSABLE_DRILLS_EN } from '../../data/grammarEng'

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: false } }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? React.createElement('div', null, 'render-error') : this.props.children }
}

const clickButtonByText = (container, text) => {
  const btn = [...container.querySelectorAll('button')].find(b => b.textContent.trim() === text)
  if (!btn) throw new Error(`button "${text}" not found`)
  act(() => { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
}

describe('Grammar cram + language switch (P2-C10)', () => {
  let root, container

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(React.createElement(Boundary, null, React.createElement(Grammar))))
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
  })

  it('serves the English deck (not the stale Malay deck) after MS→EN switch with Cram on', () => {
    clickButtonByText(container, 'SRS')      // toggle Cram ON (button label is SRS while off)
    clickButtonByText(container, 'English')  // switchLang('eng')

    const text = container.textContent
    const servesEnglish = CONFUSABLE_DRILLS_EN.some(d => text.includes(d.sentence))
    expect(servesEnglish).toBe(true)
  })
})
