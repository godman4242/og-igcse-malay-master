// @vitest-environment jsdom
//
// useFocusTrap (spec §6, D9) — reusable dialog focus management:
//  1. on activate: remember the trigger, move focus into the dialog
//  2. Tab / Shift+Tab wrap first ↔ last inside the dialog
//  3. Escape → onClose()
//  4. on deactivate/unmount: focus returns to the trigger
//
// jsdom has no native Tab traversal, so the wrap cases (first↔last) are the
// ones a unit test CAN pin — they're exactly the cases the trap implements.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useFocusTrap } from '../useFocusTrap'

function Dialog({ active, onClose }) {
  const ref = React.useRef(null)
  useFocusTrap(ref, { active, onClose })
  if (!active) return null
  return React.createElement(
    'div',
    // Passing the ref OBJECT to createElement's `ref` prop (JSX `<div ref={ref}>`),
    // not reading .current — the compiler rule can't see ref-position without JSX.
    // eslint-disable-next-line react-hooks/refs
    { ref, 'data-testid': 'dialog' },
    React.createElement('button', { id: 'first' }, 'first'),
    React.createElement('button', { id: 'middle' }, 'middle'),
    React.createElement('button', { id: 'last' }, 'last'),
  )
}

let root, host, trigger

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  // A real focusable trigger OUTSIDE the React tree, focused before activation.
  trigger = document.createElement('button')
  trigger.id = 'trigger'
  document.body.appendChild(trigger)
  trigger.focus()
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  trigger.remove()
})

const render = async (el) => act(async () => root.render(el))

const press = async (key, opts = {}) =>
  act(async () => {
    document.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }),
    )
  })

describe('useFocusTrap', () => {
  it('moves focus into the dialog on activate', async () => {
    expect(document.activeElement).toBe(trigger)
    await render(React.createElement(Dialog, { active: true, onClose: vi.fn() }))
    expect(document.activeElement.id).toBe('first')
  })

  it('wraps Tab from the last element to the first, and Shift+Tab back', async () => {
    await render(React.createElement(Dialog, { active: true, onClose: vi.fn() }))

    document.getElementById('last').focus()
    await press('Tab')
    expect(document.activeElement.id).toBe('first')

    await press('Tab', { shiftKey: true })
    expect(document.activeElement.id).toBe('last')
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    await render(React.createElement(Dialog, { active: true, onClose }))
    await press('Escape')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the trigger on deactivate', async () => {
    await render(React.createElement(Dialog, { active: true, onClose: vi.fn() }))
    expect(document.activeElement.id).toBe('first')
    await render(React.createElement(Dialog, { active: false, onClose: vi.fn() }))
    expect(document.activeElement).toBe(trigger)
  })

  it('returns focus to the trigger on unmount', async () => {
    await render(React.createElement(Dialog, { active: true, onClose: vi.fn() }))
    await act(async () => root.unmount())
    expect(document.activeElement).toBe(trigger)
    root = createRoot(host) // afterEach unmounts again — give it a fresh root
  })
})
