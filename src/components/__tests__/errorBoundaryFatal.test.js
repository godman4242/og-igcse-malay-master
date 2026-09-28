// @vitest-environment jsdom
//
// 2026-09-28 bug hunt U4: the only ErrorBoundary sat INSIDE Layout, so a crash in
// Layout / AuthGuard / the providers rendered nothing at all — a blank white page
// on every route, with no way to reach Settings. The app-wide boundary must show
// a way out, and offer to save the learner's data before anything else.
import { it, expect, vi, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from '../ErrorBoundary'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks() })

function Boom() { throw new TypeError('i.filter is not a function') }

it('a crash anywhere shows Reload + Save a copy + Start fresh, not a blank page', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(ErrorBoundary, { fatal: true }, React.createElement(Boom))))
  const labels = [...host.querySelectorAll('button')].map(b => b.textContent.trim())
  expect(host.textContent).toMatch(/Something went wrong/)
  expect(labels).toEqual(expect.arrayContaining(['Reload', 'Save a copy of my data', 'Start fresh']))
})

it('a page that failed to download says so and offers only Reload (Try Again cannot work)', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function ChunkFail() { throw new TypeError('Failed to fetch dynamically imported module: /assets/Grammar-x.js') }
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(ErrorBoundary, null, React.createElement(ChunkFail))))
  expect(host.textContent).toMatch(/Couldn't load this page/)
  expect([...host.querySelectorAll('button')].map(b => b.textContent.trim())).toEqual(['Reload Page'])
})
