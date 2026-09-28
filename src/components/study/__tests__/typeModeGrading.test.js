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
// A fresh `key` per call remounts, so a second grade() in one test isn't
// swallowed by the first one's "judged once" guard.
let mounts = 0
const grade = async (gloss, typed) => {
  const session = makeSession()
  await render(React.createElement(TypeMode, { key: ++mounts, card: { m: 'X', e: gloss, lang: 'ms', t: 'T' }, session }))
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

// R2 F10 (bug hunt 2026-09-28): "any whole word" also credited a bare FUNCTION
// word — "to" alone was Good for 98 "to …" verbs, "in"/"for"/"a"/"the" for more.
// A function word is only the answer when it IS a whole "/" alternative.
describe('TypeMode grading — a bare function word is not the meaning (R2 F10)', () => {
  it('rejects "to" for "to work"', async () => {
    expect(await grade('to work', 'to')).toBe(false)
  })
  it('rejects "a" for "a little" and "the" for "the day after tomorrow"', async () => {
    expect(await grade('a little', 'a')).toBe(false)
    expect(await grade('the day after tomorrow', 'the')).toBe(false)
  })
  it('rejects "for" for "to go for a stroll" and "in" for "once in a while"', async () => {
    expect(await grade('to go for a stroll', 'for')).toBe(false)
    expect(await grade('once in a while', 'in')).toBe(false)
  })
  it('rejects the Malay particle "di" for "di samping itu" (English study mode)', async () => {
    expect(await grade('di samping itu', 'di')).toBe(false)
  })
  it('still accepts a function word that IS the whole meaning ("to" for ke, "in" for di)', async () => {
    expect(await grade('to', 'to')).toBe(true)
    expect(await grade('at/in', 'in')).toBe(true)
  })
  it('treats ";" as an alternative separator too ("is" for "to be; is", "and" for "with; and")', async () => {
    expect(await grade('to be; is', 'is')).toBe(true)
    expect(await grade('with; and', 'and')).toBe(true)
  })
  it('ignores a (…) note on an alternative ("from" for "from (initial place, time)", "on" for "on (time)")', async () => {
    expect(await grade('from (initial place, time)', 'from')).toBe(true)
    expect(await grade('on (time)', 'on')).toBe(true)
  })
  it('treats "," as a separator on a learner-made card ("in" for "in, at")', async () => {
    expect(await grade('in, at', 'in')).toBe(true)
  })
  it('still accepts a phrase with a content word ("go for a stroll", "to work")', async () => {
    expect(await grade('to go for a stroll', 'go for a stroll')).toBe(true)
    expect(await grade('to work', 'to work')).toBe(true)
  })
})

// R2 F9: iOS Smart Punctuation types ’ — "don’t" for jangan ("don't") was wrong.
describe('TypeMode grading — curly apostrophes match (R2 F9)', () => {
  it('accepts "Don’t" typed with ’ for "don\'t"', async () => {
    expect(await grade("don't", 'Don’t')).toBe(true)
  })
})
