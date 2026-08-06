// Census A7 (2026-08-06): gtx reported a FAILED translation as a SUCCESS.
//
//   const out = data?.[0]?.map(s => s[0]).join('') || text
//   return { text: out, source: 'gtx', provider: 'gtx' }
//
// On a 200 response with an empty or unexpected body, `|| text` fell back to
// the SOURCE WORD and tagged it `source: 'gtx'` — the success marker. Every
// downstream guard keys off `source === 'error'`, so all of them were bypassed:
//   · translationCache.writeCache refuses to persist errors precisely because
//     they are "usually the input word AS its own translation" — that guard
//     never fired, so the echo was cached and the read-hit short-circuited
//     every future retry, permanently serving the word as its own gloss;
//   · SelectionToCard showed it as a real translation instead of an error;
//   · translateDocument counted it as a translated word.
//
// The fix reports the failure. It deliberately does NOT treat
// "translation equals the source word" as an error — `radio`, `bas` and other
// loanwords legitimately translate to themselves, and flagging those would
// trade one confident-wrong behaviour for another.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { gtxTranslateOne, gtxTranslateBatch } from '../gtx.js'

const respond = (body, ok = true, status = 200) => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  })
}

afterEach(() => { vi.restoreAllMocks(); delete globalThis.fetch })

describe('gtx provider — a failed translation must not look like a successful one (A7)', () => {
  it('returns the translation on a well-formed response', async () => {
    respond([[['house', 'rumah', null, null, 10]]])
    const res = await gtxTranslateOne('rumah', 'ms', 'en')
    expect(res).toMatchObject({ text: 'house', source: 'gtx', provider: 'gtx' })
  })

  it('reports source:"error" when the body carries no translation', async () => {
    respond([[]])
    const res = await gtxTranslateOne('makan', 'ms', 'en')
    expect(res.source, 'an empty body is a failure, not a translation').toBe('error')
  })

  it('reports source:"error" when the body is an unexpected shape', async () => {
    respond({ unexpected: true })
    const res = await gtxTranslateOne('makan', 'ms', 'en')
    expect(res.source).toBe('error')
  })

  it('never echoes the source word back as a successful translation', async () => {
    // This is the defect in one assertion: the old code returned
    // { text: 'makarn', source: 'gtx' } — an OCR'd token glossed as itself,
    // cached forever, and mintable straight into an FSRS card.
    respond([[]])
    const res = await gtxTranslateOne('makarn', 'ms', 'en')
    expect(res.text === 'makarn' && res.source === 'gtx').toBe(false)
  })

  it('still allows a genuine self-translation (loanwords) through as success', async () => {
    // Guard against over-correcting: `radio` really is `radio`.
    respond([[['radio', 'radio', null, null, 10]]])
    const res = await gtxTranslateOne('radio', 'ms', 'en')
    expect(res).toMatchObject({ text: 'radio', source: 'gtx' })
  })

  it('still throws on a non-2xx so the router can fail over to another provider', async () => {
    respond(null, false, 429)
    await expect(gtxTranslateOne('makan', 'ms', 'en')).rejects.toThrow(/429/)
  })

  it('marks each failed item in a batch without failing the whole batch', async () => {
    respond([[]])
    const out = await gtxTranslateBatch(['satu', 'dua'], 'ms', 'en')
    expect(out.map(r => r.source)).toEqual(['error', 'error'])
  })
})
