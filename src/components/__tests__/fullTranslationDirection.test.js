// @vitest-environment jsdom
//
// FullTranslationView must thread its from/to direction into translateDocument so
// an English (0510 ESL) learner gets a MALAY translation of an English doc (en→ms),
// not the ms→en default (which would echo English back as Malay). Default props
// (ms→en) keep the shipped Malay-reader behaviour byte-identical.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

const { translateDocumentMock } = vi.hoisted(() => ({
  translateDocumentMock: vi.fn(() => Promise.resolve({})),
}))
vi.mock('../../lib/translateDocument', async (importOriginal) => ({
  ...(await importOriginal()),
  translateDocument: translateDocumentMock,
}))

import FullTranslationView from '../FullTranslationView'

const PAGES = [{ pageNum: 1, paragraphs: ['Hello world.'] }]
let root, host

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  translateDocumentMock.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function clickByText(text) {
  const btn = [...host.querySelectorAll('button')].find((b) => b.textContent.includes(text))
  if (!btn) throw new Error(`button "${text}" not found`)
  return act(async () => { btn.click() })
}

describe('FullTranslationView direction', () => {
  const mount = (props) => act(async () => {
    root.render(React.createElement(FullTranslationView, { pages: PAGES, onBack: () => {}, ...props }))
  })

  it('threads from="en"/to="ms" into translateDocument for an English learner', async () => {
    await mount({ from: 'en', to: 'ms', revealLabel: 'Malay' })
    await clickByText('Show Malay')
    expect(translateDocumentMock).toHaveBeenCalled()
    const opts = translateDocumentMock.mock.calls[0][1]
    expect(opts.from).toBe('en')
    expect(opts.to).toBe('ms')
  })

  it('defaults to ms→en (Malay-reader byte-identical) when no direction is given', async () => {
    await mount({})
    await clickByText('Show English')
    expect(translateDocumentMock).toHaveBeenCalled()
    const opts = translateDocumentMock.mock.calls[0][1]
    expect(opts.from).toBe('ms')
    expect(opts.to).toBe('en')
  })

  it('flips the paragraph reveal label by revealLabel', async () => {
    await mount({ from: 'en', to: 'ms', revealLabel: 'Malay' })
    expect(host.textContent).toContain('Show Malay')
    expect(host.textContent).not.toContain('Show English')
  })
})
