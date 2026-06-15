// @vitest-environment jsdom
//
// TypeMode answer-grading must be whole-word, not arbitrary-substring.
//
// BUG (fixed): `check()` graded a typed answer correct when the gloss merely
// CONTAINED it as a substring — `card.e.toLowerCase().includes(trimmed)` — with
// no length floor or word boundary. So a learner typing a fragment or an
// unrelated short substring got confident-WRONG "✅ Correct!" feedback, which
// both lies and defeats active recall (the point of type-answer mode):
//   gloss "water" (air)      + "a"      → was ✅, must be ❌
//   gloss "century" (abad)   + "cent"   → was ✅, must be ❌
//   gloss "another"          + "other"  → was ✅, must be ❌  (wrong word!)
//   gloss "many/much"        + "an"     → was ✅, must be ❌
// The legitimate leniency — accepting a whole alternative/word of a multi-part
// gloss — must SURVIVE (95 dict glosses use "/" alternatives, 192 are
// multi-word). Fix reuses the app's whole-word helper (wholeWordMatch.js), the
// same boundary used by the roleplay-scorecard / cloze-blank substring fixes.
//
// Mount harness mirrors typeModeLang.test.js (createRoot + act). Grade is read
// off the session stub's recorded rating: Rating.Good = correct, else wrong.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import TypeMode from '../TypeMode'
import { Rating } from '../../../lib/fsrs'

let root, host

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const render = (el) => act(async () => root.render(el))

const makeSession = () => {
  const ratings = []
  return {
    confidence: 2,
    setConfidence() {},
    rate(r) { ratings.push(r) },
    pendingWrongWord: null,
    hypercorrect: false,
    reasonTagged: null,
    tagReason() {},
    ratings,
  }
}

// Set a controlled React input's value and fire onChange the way the browser does.
const setNativeValue = (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

// Mount TypeMode for `gloss`, type `typed`, click Check, return whether it graded correct.
const grade = async (gloss, typed) => {
  const session = makeSession()
  await render(React.createElement(TypeMode, { card: { m: 'X', e: gloss, lang: 'ms', t: 'T' }, session }))
  const input = host.querySelector('input')
  setNativeValue(input, typed)
  await act(async () => { host.querySelector('button').click() })
  return session.ratings[session.ratings.length - 1] === Rating.Good
}

describe('TypeMode grading — arbitrary substrings are NOT correct (bug fix)', () => {
  it('rejects a single-letter fragment ("a" for "water")', async () => {
    expect(await grade('water', 'a')).toBe(false)
  })
  it('rejects a leading word-fragment ("cent" for "century")', async () => {
    expect(await grade('century', 'cent')).toBe(false)
  })
  it('rejects an unrelated word that is a substring ("other" for "another")', async () => {
    expect(await grade('another', 'other')).toBe(false)
  })
  it('rejects a mid-word fragment across an alternative ("an" for "many/much")', async () => {
    expect(await grade('many/much', 'an')).toBe(false)
  })
})

describe('TypeMode grading — legitimate answers stay correct (leniency preserved)', () => {
  it('accepts the exact full gloss ("water" for "water")', async () => {
    expect(await grade('water', 'water')).toBe(true)
  })
  it('accepts one "/" alternative ("is" for "is/are")', async () => {
    expect(await grade('is/are', 'is')).toBe(true)
  })
  it('accepts the other "/" alternative ("are" for "is/are")', async () => {
    expect(await grade('is/are', 'are')).toBe(true)
  })
  it('accepts a whole word of a multi-word gloss ("brother" for "older brother")', async () => {
    expect(await grade('older brother', 'brother')).toBe(true)
  })
  it('accepts the bare verb of a "to ..." gloss ("work" for "to work")', async () => {
    expect(await grade('to work', 'work')).toBe(true)
  })
  it('is case-insensitive and trims ("  WATER " for "water")', async () => {
    expect(await grade('water', '  WATER ')).toBe(true)
  })
})
