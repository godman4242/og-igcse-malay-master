// @vitest-environment jsdom
//
// GOAL.md item 0-ter (found 2026-08-03 while red-proofing C6): answering a
// grammar drill WRONG swapped the question out from under the learner.
//
// Mechanism (all six SRS-sorted tabs share it):
//   answer → reviewGrammarDrill(id, correct) writes a card into `grammarCards`
//          → the `sortedX` useMemo depends on `grammarCards`, so it re-sorts
//          → the just-answered drill is no longer "unseen" and no longer due,
//            so sortDrillsBySRS ranks it AFTER every still-unseen drill
//          → the deck shifts up while the tab's index (`drillIdx`, `tenseIdx`,
//            …) stays put, so `sortedX[idx]` now resolves to a DIFFERENT drill
//          → the card re-renders with the NEXT question while the feedback
//            panel (and ActiveCorrection) still talks about the previous one.
// Observed live: the imbuhan card displayed the root `baca` while demanding
// the answer `menulis`.
//
// Contract pinned here: **the question visible while feedback is showing is the
// question that was answered.** One test per SRS-sorted tab (Malay imbuhan /
// tense / find-error / transform, English confusables / SVA / articles) because
// each tab holds its own index and its own feedback state.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Grammar → useStore → zustand/persist needs localStorage at import time.
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

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: Grammar } = await import('../Grammar')
const { default: useStore } = await import('../../store/useStore')
const { isDue } = await import('../../lib/fsrs')
const { IMBUHAN_DRILLS, TENSE_DRILLS, ERROR_DRILLS, TRANSFORM_DRILLS } = await import('../../data/grammar')
const { CONFUSABLE_DRILLS_EN, SVA_DRILLS_EN, ARTICLE_DRILLS_EN } = await import('../../data/grammarEng')

describe('Grammar — the answered drill stays on screen for the lifetime of its feedback (0-ter)', () => {
  let root, container

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    // The store is a module singleton; a leftover grammarCard from a previous
    // test changes which drill sorts first and the next test passes vacuously.
    useStore.setState({
      cognitiveProfile: { studentId: 'local_user', masteredConcepts: [], learningConcepts: [], recentMistakes: [] },
      grammarCards: {},
      grammarStats: {},
      mistakes: [],
      studyLang: 'ms',
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(React.createElement(Grammar)))
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
  })

  // ---- DOM helpers ------------------------------------------------------
  const buttonsIn = (sel) => [...(container.querySelector(sel)?.querySelectorAll('button') || [])]
  const clickEl = async (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

  const switchToEnglish = async () => {
    const btn = buttonsIn('[data-guide="grammar-lang"]').find(b => b.textContent.trim() === 'English')
    expect(btn, 'English language toggle should be mounted').toBeTruthy()
    await clickEl(btn)
  }

  const clickTab = async (label) => {
    const btn = buttonsIn('[data-guide="grammar-tabs"]').find(b => b.textContent.trim().startsWith(label))
    expect(btn, `"${label}" tab should be mounted`).toBeTruthy()
    await clickEl(btn)
  }

  const typeAndCheck = async (value) => {
    const input = container.querySelector('input[type="text"]')
    expect(input, 'text input should be mounted').toBeTruthy()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const check = [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Check')
    expect(check, '"Check" button should be mounted').toBeTruthy()
    await clickEl(check)
  }

  // The MCQ option grid is the only 2-col grid on these cards.
  const pickWrongOption = async (correctAnswer) => {
    const opts = buttonsIn('.grid.grid-cols-2')
    expect(opts.length, 'MCQ options should be mounted').toBeGreaterThan(1)
    const wrong = opts.find(b => b.textContent.trim() !== correctAnswer)
    expect(wrong, 'there should be at least one wrong option').toBeTruthy()
    await clickEl(wrong)
  }

  const textOf = (sel) => container.querySelector(sel)?.textContent?.trim() ?? null

  // Non-vacuity guard: the swap only happens because answering makes the drill
  // stop sorting first. If that stops being true the assertions below would
  // pass for the wrong reason, so every case asserts this precondition.
  const expectDeckWouldResort = (drillId) => {
    const card = useStore.getState().grammarCards[drillId]
    expect(card, `answering should have written a grammarCard for ${drillId}`).toBeTruthy()
    expect(isDue(card), `${drillId} must stop being due after an answer, or the deck would not re-sort`).toBe(false)
  }

  // ---- Malay tabs -------------------------------------------------------

  it('imbuhan (Malay, default first-run path): the root stays put on a wrong answer', async () => {
    const first = IMBUHAN_DRILLS[0]
    expect(textOf('.text-2xl')).toBe(first.root)

    await typeAndCheck('metulis') // wrong

    expectDeckWouldResort(first.id)
    expect(textOf('.text-2xl'), 'the visible root must still be the one the learner answered').toBe(first.root)
    expect(container.textContent).toContain(`Jawapan: ${first.answer}`)
  })

  it('tense (Malay): the sentence stays put on a wrong answer', async () => {
    await clickTab('Tense')
    const first = TENSE_DRILLS[0]
    expect(textOf('p.text-lg')).toBe(first.sentence)

    await pickWrongOption(first.answer)

    expectDeckWouldResort(first.id)
    expect(textOf('p.text-lg'), 'the visible sentence must still be the one the learner answered').toBe(first.sentence)
    expect(container.textContent).toContain(`Jawapan: ${first.answer}`)
  })

  it('find-error (Malay): the sentence stays put on a wrong answer', async () => {
    await clickTab('Find Error')
    const first = ERROR_DRILLS[0]
    expect(textOf('p.text-lg')).toBe(first.sentence)

    await pickWrongOption(first.answer)

    expectDeckWouldResort(first.id)
    expect(textOf('p.text-lg'), 'the visible sentence must still be the one the learner answered').toBe(first.sentence)
    expect(container.textContent).toContain(first.explanation)
  })

  it('transform (Malay): the sentence stays put on a wrong answer', async () => {
    await clickTab('Transform')
    const first = TRANSFORM_DRILLS[0]
    expect(textOf('p.text-lg')).toBe(first.sentence)

    await typeAndCheck('salah sama sekali') // wrong

    expectDeckWouldResort(first.id)
    expect(textOf('p.text-lg'), 'the visible sentence must still be the one the learner answered').toBe(first.sentence)
    expect(container.textContent).toContain(`Jawapan: ${first.answer}`)
  })

  // ---- English tabs -----------------------------------------------------

  it('confusables (English): the sentence stays put on a wrong answer', async () => {
    await switchToEnglish()
    const first = CONFUSABLE_DRILLS_EN[0]
    expect(textOf('p.text-base')).toBe(first.sentence)

    await pickWrongOption(first.answer)

    expectDeckWouldResort(first.id)
    expect(textOf('p.text-base'), 'the visible sentence must still be the one the learner answered').toBe(first.sentence)
    expect(container.textContent).toContain(`Answer: ${first.answer}`)
  })

  it('SVA (English): the sentence stays put on a wrong answer', async () => {
    await switchToEnglish()
    await clickTab('SVA')
    const first = SVA_DRILLS_EN[0]
    expect(textOf('p.text-base')).toBe(first.sentence)

    await pickWrongOption(first.answer)

    expectDeckWouldResort(first.id)
    expect(textOf('p.text-base'), 'the visible sentence must still be the one the learner answered').toBe(first.sentence)
    expect(container.textContent).toContain(`Answer: ${first.answer}`)
  })

  it('articles (English): the sentence stays put on a wrong answer', async () => {
    await switchToEnglish()
    await clickTab('Articles')
    const first = ARTICLE_DRILLS_EN[0]
    expect(textOf('p.text-base')).toBe(first.sentence)

    await pickWrongOption(first.answer)

    expectDeckWouldResort(first.id)
    expect(textOf('p.text-base'), 'the visible sentence must still be the one the learner answered').toBe(first.sentence)
    expect(container.textContent).toContain(`Answer: ${first.answer}`)
  })
})
