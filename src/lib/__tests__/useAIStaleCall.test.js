// @vitest-environment jsdom
//
// 2026-09-29 loop review P2-2: Writing's clearGrade() calls ai.reset() mid-request. The
// aborted request rejected AFTER the reset and wrote its "Request aborted" error back, so
// the next grade showed a red "AI feedback unavailable" though nothing had failed.
import { it, expect, vi, beforeEach, afterEach } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { useAI } = await import('../ai.js')

let ai, root, host
function Probe() { ai = useAI(); return null }
beforeEach(async () => {
  vi.stubEnv('VITE_AI_MOCK', 'true') // the canned, chunk-by-chunk stream (honours the abort signal)
  host = document.createElement('div')
  root = createRoot(host)
  await act(async () => root.render(React.createElement(Probe)))
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllEnvs() })

it('a request reset mid-stream leaves no error, text or spinner behind', async () => {
  let settled
  await act(async () => { settled = ai.call({ action: 'chat', payload: {} }).catch(e => e) })
  await act(async () => { await new Promise(r => setTimeout(r, 5)); ai.reset() })
  const err = await settled
  expect(err?.message).toMatch(/aborted/i) // the caller still hears it was stopped…
  await act(async () => { await new Promise(r => setTimeout(r, 50)) })
  expect(ai.error).toBeNull() // …but the screen doesn't
  expect(ai.streamedText).toBe('')
  expect(ai.isLoading).toBe(false)
})

it('a newer call is not marked finished by the older one it replaced', async () => {
  let first
  await act(async () => { first = ai.call({ action: 'chat', payload: {} }).catch(e => e) })
  await act(async () => { ai.call({ action: 'chat', payload: {} }).catch(() => {}) })
  await first
  await act(async () => { await new Promise(r => setTimeout(r, 5)) })
  expect(ai.isLoading).toBe(true)
  expect(ai.error).toBeNull()
})
