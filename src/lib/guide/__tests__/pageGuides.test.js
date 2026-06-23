import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PAGE_GUIDES, buildPageSteps } from '../pageGuides'
import { PAGE_GUIDE_ROUTES } from '../pageGuideRoutes'
import { APP_ROUTES } from '../tourSteps'

const here = dirname(fileURLToPath(import.meta.url))
const readSrc = (p) => readFileSync(resolve(here, p), 'utf8')

const SELECTOR_RE = /^\[data-(tour|guide)="[a-z0-9-]+"\]$/

describe('pageGuides content', () => {
  it('every step has a non-empty title + body and a valid anchor selector', () => {
    for (const [route, steps] of Object.entries(PAGE_GUIDES)) {
      expect(Array.isArray(steps), route).toBe(true)
      for (const s of steps) {
        expect(s.title?.trim(), `${route} title`).toBeTruthy()
        expect(s.body?.trim(), `${route} body`).toBeTruthy()
        if (s.arrow !== 'none') expect(s.selector, `${route} selector`).toMatch(SELECTOR_RE)
      }
    }
  })

  it('all route keys are real app routes', () => {
    for (const route of Object.keys(PAGE_GUIDES)) expect(APP_ROUTES).toContain(route)
  })

  it('PAGE_GUIDE_ROUTES stays in sync with PAGE_GUIDES (eager seam cannot drift)', () => {
    expect([...PAGE_GUIDE_ROUTES].sort()).toEqual(Object.keys(PAGE_GUIDES).sort())
  })
})

// T9 increment 2 + the empty-reader robustness fix (2026-06-23). The PDF reader
// is the lone page whose key controls (the toolbar) mount only AFTER a doc loads,
// so on the empty landing — the state a brand-new student launches ▶ in — 7 of 10
// anchored steps used to silently skip (the controller drops a missing anchor).
// Fix = mirror the Comprehension/Listening pattern: the loaded-state controls are
// taught as centered arrow:'none' summary cards (which render in ANY state), so
// the tour skips nothing on an empty reader. Only the sample CTA — present on the
// empty landing — stays anchored.
const PDF_CONTROL_ANCHORS = [
  'pdf-sample', 'pdf-reading', 'pdf-mode', 'pdf-translate',
  'pdf-sentences', 'pdf-fulltranslation', 'pdf-view', 'pdf-replace',
]

describe('pageGuides — /pdf-reader deep dive', () => {
  const steps = PAGE_GUIDES['/pdf-reader']

  it('exists with a centered intro + several steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(7)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('teaches loaded-state controls as centered cards (no skip on an empty reader)', () => {
    // The empty-landing branch of PDFReader.jsx mounts ONLY the sample CTA, so
    // the ONLY anchored step may be pdf-sample; every other control is a centered
    // card and therefore renders whether or not a doc is loaded — no fast-skip,
    // no dead-end, on a blank reader.
    const anchored = steps.filter(s => s.selector).map(s => s.selector)
    expect(anchored).toEqual(['[data-guide="pdf-sample"]'])
    // The non-anchored control steps are explicit centered cards.
    for (const s of steps) {
      if (!s.selector) expect(s.arrow, s.title).toBe('none')
    }
  })

  it('every pdf control anchor it teaches exists in PDFReader.jsx source', () => {
    // Non-tautological (the old test checked the guide's own list against itself):
    // cross-verify every control anchor against the REAL component source, so
    // renaming/removing one in PDFReader.jsx fails this test. The attributes stay
    // even where the guide now teaches via a card — keeping a future arrow upgrade
    // (or the loaded-state e2e cross-check) anchored to a live node.
    const src = readSrc('../../../pages/PDFReader.jsx')
    for (const anchor of PDF_CONTROL_ANCHORS) {
      expect(src, anchor).toContain(`data-guide="${anchor}"`)
    }
  })

  it('opens with the sample step (the empty-landing CTA), then centered cards', () => {
    const firstAnchored = steps.find(s => s.selector)
    expect(firstAnchored.selector).toBe('[data-guide="pdf-sample"]')
  })
})

// T10 — the Study page deep dive. Pins that the guide exists, covers every
// meaningful loaded-state control via a [data-guide="study-…"] anchor that
// EXISTS in Study.jsx (no arrow at a missing node), and opens with a centered
// intro (always renders, even on an empty deck) so it never dead-ends.
describe('pageGuides — /study deep dive', () => {
  const steps = PAGE_GUIDES['/study']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(5)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each meaningful control with a real study anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="study-deck"]',
      '[data-guide="study-modes"]',
      '[data-guide="study-stats"]',
      '[data-guide="study-card"]',
      '[data-guide="study-skip"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T11 — the Smart Study page deep dive. Pins that the guide exists, covers each
// config-screen control via a [data-guide="smartstudy-…"] anchor that EXISTS in
// SmartStudy.jsx (no arrow at a missing node — the config screen is the landing
// state, before "Begin Session" enters the theater-mode session), and opens with
// a centered intro (always renders) so it never dead-ends.
describe('pageGuides — /smart-study deep dive', () => {
  const steps = PAGE_GUIDES['/smart-study']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each config-screen control with a real smartstudy anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="smartstudy-speaking"]',
      '[data-guide="smartstudy-begin"]',
      '[data-guide="smartstudy-manual"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T11 — the Practice hub deep dive. Pins that the guide exists, covers each
// hub concept (grouped layout, tile launchers, live status cues) via a
// [data-guide="practice-…"] anchor that EXISTS in Practice.jsx on an
// ALWAYS-present element (the status badge text is conditional, but the tile
// button it sits on is not — so no arrow points at a missing node), and opens
// with a centered intro (always renders) so it never dead-ends.
describe('pageGuides — /practice deep dive', () => {
  const steps = PAGE_GUIDES['/practice']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each hub concept with a real practice anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="practice-groups"]',
      '[data-guide="practice-tile"]',
      '[data-guide="practice-cue"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T12 — the Roleplay picker deep dive. Pins that the guide exists, covers each
// picker-screen control via a [data-guide="roleplay-…"] anchor that EXISTS in
// Roleplay.jsx on an ALWAYS-mounted element (the language toggle + tabs render
// unconditionally; the first scenario card always renders because the default
// tab is 'scenarios' and the scenario list is never empty), and opens with a
// centered intro (always renders) so it never dead-ends. The picker is a normal
// (non-theater) page — only the active session enters theater mode — so the
// header ▶ is the entry.
describe('pageGuides — /roleplay deep dive', () => {
  const steps = PAGE_GUIDES['/roleplay']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each picker control with a real roleplay anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="roleplay-lang"]',
      '[data-guide="roleplay-tabs"]',
      '[data-guide="roleplay-scenario"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T13 — the Grammar drills deep dive. Pins that the guide exists, covers each
// always-mounted control via a [data-guide="grammar-…"] anchor that EXISTS in
// Grammar.jsx (the SRS/Cram pill, language toggle and tab row render
// unconditionally; the default tab is 'drill' so a drill card is always present
// on landing — the anchor sits on BOTH the Malay and English drill branches,
// only one of which mounts at a time), and opens with a centered intro (always
// renders) so it never dead-ends. Grammar is a normal (non-theater) page → the
// header ▶ is the entry.
describe('pageGuides — /grammar deep dive', () => {
  const steps = PAGE_GUIDES['/grammar']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each control with a real grammar anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="grammar-mode"]',
      '[data-guide="grammar-lang"]',
      '[data-guide="grammar-tabs"]',
      '[data-guide="grammar-drill"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T14 — the Writing Analyzer deep dive. Pins that the guide exists, covers each
// always-mounted landing-state control via a [data-guide="writing-…"] anchor that
// EXISTS in Writing.jsx (the language toggle, format card, textarea and Analyze
// button all render when lang !== 'templates' — the default), and opens with a
// centered intro (always renders) so it never dead-ends. Writing is a normal page
// at landing — theater mode engages only while DRAFTING (textarea focused +
// non-empty), so on arrival the header ▶ is the entry.
//
// Empty-vs-draft robustness (2026-06-23): the "Try a sample" CTA renders ONLY while
// the composer is empty (showSampleCta = lang!=='templates' && !text && !results),
// so a returning user with a draft or visible results would make an ANCHORED sample
// step's node absent → the controller fast-skips it (guideController.js). Fix mirrors
// the /pdf-reader + Comprehension/Listening pattern: the sample is taught as a
// centered arrow:'none' card (renders in ANY composer state, never skips); the first
// ANCHORED step is the always-present language toggle.
describe('pageGuides — /writing deep dive', () => {
  const steps = PAGE_GUIDES['/writing']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(5)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each always-mounted control with a real writing anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="writing-lang"]',
      '[data-guide="writing-format"]',
      '[data-guide="writing-compose"]',
      '[data-guide="writing-analyze"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })

  it('teaches the sample CTA as a centered card so a draft-in-progress never skips it', () => {
    // The sample step must NOT be anchored to the conditionally-rendered
    // writing-sample CTA — otherwise it fast-skips for a user who already has a
    // draft/results. It is a centered arrow:'none' card; the first ANCHORED step
    // is the always-present language toggle.
    const sample = steps.find(s => /try a sample/i.test(s.title))
    expect(sample, 'a "Try a sample" step exists').toBeTruthy()
    expect(sample.selector, 'sample step is not anchored').toBeUndefined()
    expect(sample.arrow, 'sample step is a centered card').toBe('none')
    const anchored = steps.filter(s => s.selector).map(s => s.selector)
    expect(anchored).not.toContain('[data-guide="writing-sample"]')
    expect(anchored[0], 'first anchored step is the always-present lang toggle')
      .toBe('[data-guide="writing-lang"]')
  })
})

// T15 — the Comprehension picker deep dive. Pins that the guide exists, covers
// each picker-screen control via a [data-guide="comprehension-…"] anchor that
// EXISTS in Comprehension.jsx on an ALWAYS-mounted element (the first passage
// card + its badge row always render because the passage list is static and
// never empty), and opens with a centered intro (always renders) so it never
// dead-ends. Comprehension is a normal (non-theater) page → the header ▶ is the
// entry. The reading-screen mechanics (tap-to-look-up, Read along, the MCQ +
// instant explanation, the score) only mount after a passage opens, so they are
// taught in a centered summary step (no arrow → never misses), not anchored.
describe('pageGuides — /comprehension deep dive', () => {
  const steps = PAGE_GUIDES['/comprehension']

  it('exists with a centered intro + several steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each picker control with a real comprehension anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="comprehension-passages"]',
      '[data-guide="comprehension-badges"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T16 — the Listening picker deep dive. Pins that the guide exists, covers each
// picker-screen control via a [data-guide="listening-…"] anchor that EXISTS in
// Listening.jsx on an ALWAYS-mounted element (the first passage card + its badge
// row always render because the passage list is static and never empty), and
// opens with a centered intro (always renders) so it never dead-ends. Listening
// is a normal (non-theater) page → the header ▶ is the entry. The hear-it loop
// (Play / replay / unlock-questions / the MCQ + explanation / the score /
// transcript) only mounts after a passage opens, so it is taught in a centered
// summary step (no arrow → never misses), not anchored.
describe('pageGuides — /listening deep dive', () => {
  const steps = PAGE_GUIDES['/listening']

  it('exists with a centered intro + several steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each picker control with a real listening anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="listening-passages"]',
      '[data-guide="listening-badges"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T17 — the Speaking picker deep dive. Pins that the guide exists, covers each
// picker-screen control via a [data-guide="speaking-…"] anchor that EXISTS in
// Speaking.jsx on an ALWAYS-mounted element (the language toggle renders
// unconditionally; the first topic card + its badge row always render because
// the topic list is static and never empty — each card always carries the
// ~Ns duration badge), and opens with a centered intro (always renders) so it
// never dead-ends. The PICK screen is a normal (non-theater) page — only the
// active PREP/RECORD session enters theater mode — so the header ▶ is the entry.
// The prep→record→results flow only mounts after a topic opens, so it is taught
// in a centered summary step (no arrow → never misses), not anchored.
describe('pageGuides — /speaking deep dive', () => {
  const steps = PAGE_GUIDES['/speaking']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each picker control with a real speaking anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="speaking-lang"]',
      '[data-guide="speaking-topics"]',
      '[data-guide="speaking-badges"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T18 — the Import page deep dive. Pins that the guide exists, covers each
// always-mounted landing control via a [data-guide="import-…"] anchor that
// EXISTS in Import.jsx (the input-source tabs, the paste textarea [default tab],
// the deck-name input, the Process button and the Word-by-Word button all render
// on arrival), and opens with a centered intro (always renders) so it never
// dead-ends. Import is a normal (non-theater) page → the header ▶ is the entry.
// The post-Process chip grid (select + Add N cards + Undo) only mounts after
// Process runs, so it is taught in a centered summary step (no arrow → never
// misses), not anchored.
describe('pageGuides — /import deep dive', () => {
  const steps = PAGE_GUIDES['/import']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(5)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each landing control with a real import anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="import-tabs"]',
      '[data-guide="import-text"]',
      '[data-guide="import-deck"]',
      '[data-guide="import-process"]',
      '[data-guide="import-wordbyword"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T19 — the Mistake Journal deep dive. The journal has TWO mutually-exclusive
// render states with NO element common to both: a celebratory EmptyState (a new
// user with zero mistakes — the dominant guide-explorer case) and the populated
// journal (the Fix button, filter pills, charts and per-mistake cards). Any
// ANCHORED step would skip-then-hang on the empty state (the GOAL-backlog-#5 /
// Bug-A class), so EVERY step is a centered arrow:'none' card that renders
// identically in both states — and the page needs zero JSX anchors. /mistakes is
// a normal (non-theater) page → the header ▶ is the entry.
describe('pageGuides — /mistakes deep dive', () => {
  const steps = PAGE_GUIDES['/mistakes']

  it('exists with a centered intro + several steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('is ENTIRELY centered cards (no anchor → never skips on the empty journal)', () => {
    // The empty-state EmptyState mounts none of the journal controls, so an
    // anchored step would fast-skip there. Every step must be a centered card.
    for (const s of steps) {
      expect(s.selector, s.title).toBeUndefined()
      expect(s.arrow, s.title).toBe('none')
    }
  })
})

// T20 — the Exam Rehearsal deep dive. Pins that the guide exists, covers each
// always-mounted INTRO/landing control via a [data-guide="exam-…"] anchor that
// EXISTS in ExamRehearsal.jsx (the four-skill Stages overview card, the language
// toggle and the Start button all render unconditionally on the INTRO screen —
// the landing state), and opens with a centered intro (always renders) so it
// never dead-ends. ExamRehearsal is a normal (non-theater) page — it never calls
// useTheaterMode, so the header stays put — so the header ▶ is the entry. The
// timed stages (comprehension → listening → writing → speaking → results) only
// mount after Start is pressed, so they are taught in a centered summary step
// (no arrow → never misses), not anchored.
describe('pageGuides — /exam-rehearsal deep dive', () => {
  const steps = PAGE_GUIDES['/exam-rehearsal']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each landing control with a real exam anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="exam-stages"]',
      '[data-guide="exam-lang"]',
      '[data-guide="exam-start"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })
})

// T21 — the For You deep dive. Like /mistakes, For You has TWO mutually-exclusive
// render states with NO shared control: a brand-new learner sees the GetStarted
// empty card (visible.length === 0 → "Your home fills up as you learn"), a
// returning learner sees the personalized shelves (Keep going / Picked for you /
// Still remember these? / saved / goal). Any ANCHORED step would skip-then-hang on
// the empty state (the GOAL-backlog-#5 / Bug-A class), so EVERY step is a centered
// arrow:'none' card that renders identically in both states — and the page needs
// zero JSX anchors. /for-you is a normal (non-theater) page → the header ▶ is the
// entry.
describe('pageGuides — /for-you deep dive', () => {
  const steps = PAGE_GUIDES['/for-you']

  it('exists with a centered intro + several steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('is ENTIRELY centered cards (no anchor → never skips between the empty + populated states)', () => {
    // The GetStarted empty card mounts none of the shelves, so an anchored step
    // would fast-skip there. Every step must be a centered card.
    for (const s of steps) {
      expect(s.selector, s.title).toBeUndefined()
      expect(s.arrow, s.title).toBe('none')
    }
  })
})

// T22 — the Word Families deep dive. Pins that the guide exists, covers each
// always-mounted landing control via a [data-guide="wordfamilies-…"] anchor that
// EXISTS in WordFamilies.jsx on an ALWAYS-mounted element (the search input
// renders unconditionally; the first root card always renders because the root
// list is static, 41 entries, and only filters to empty on a no-match SEARCH —
// never on the landing state the guide launches in), and opens with a centered
// intro (always renders) so it never dead-ends. WordFamilies is a normal
// (non-theater) page → the header ▶ is the entry. The family TREE (tap-to-hear,
// the +/✓ add-to-deck, the POS colour legend, the detail modal) and the
// conditional "Related to Your Mistakes" panel only mount after a root expands /
// when mistakes exist, so they are taught in a centered summary step (no arrow →
// never misses), not anchored.
describe('pageGuides — /word-families deep dive', () => {
  const steps = PAGE_GUIDES['/word-families']

  it('exists with a centered intro + several steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each landing control with a real wordfamilies anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="wordfamilies-search"]',
      '[data-guide="wordfamilies-roots"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })

  it('teaches the tree mechanics as a centered card (the tree only mounts on expand)', () => {
    // The radial tree + its add-to-deck/speak controls render only after a root
    // is tapped, so they must NOT be anchored — a centered arrow:'none' summary
    // renders in any state and never fast-skips.
    const summary = steps.find(s => /family tree/i.test(s.title))
    expect(summary, 'an "Inside a family tree" step exists').toBeTruthy()
    expect(summary.selector, 'summary step is not anchored').toBeUndefined()
    expect(summary.arrow, 'summary step is a centered card').toBe('none')
  })
})

// T23 — the Cikgu Maya tutor deep dive. Pins that the guide exists, covers each
// always-mounted control via a [data-guide="cikgu-…"] anchor that EXISTS in
// CikguBot.jsx on an ALWAYS-mounted element (the Expert/AI mode toggle in the
// header + the question input row both render unconditionally in the default
// view — the landing state), and opens with a centered intro (always renders) so
// it never dead-ends. CikguBot is a normal (non-theater) page → the header ▶ is
// the entry. The empty-state helpers (suggested prompts + Browse Topics), the
// capability-gated Voice/mic controls and the per-answer Expert/AI tag are taught
// in a centered summary step (no arrow → never misses), not anchored — they only
// render in some states (a fresh chat / a speech-capable device / after a reply).
describe('pageGuides — /cikgu deep dive', () => {
  const steps = PAGE_GUIDES['/cikgu']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each landing control with a real cikgu anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="cikgu-mode"]',
      '[data-guide="cikgu-input"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })

  it('every cikgu anchor it teaches exists in CikguBot.jsx source', () => {
    // Non-tautological: cross-verify each anchor against the REAL component, so
    // renaming/removing one in CikguBot.jsx fails this test (mirrors the
    // /pdf-reader source-scan).
    const src = readSrc('../../../pages/CikguBot.jsx')
    for (const anchor of ['cikgu-mode', 'cikgu-input']) {
      expect(src, anchor).toContain(`data-guide="${anchor}"`)
    }
  })
})

describe('buildPageSteps', () => {
  it('stamps the given route on every step and maps to the engine shape', () => {
    const steps = buildPageSteps('/')
    expect(steps.length).toBeGreaterThan(0)
    for (const s of steps) {
      expect(s.route).toBe('/')
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('title')
      expect(s).toHaveProperty('body')
    }
  })

  it('returns [] for a route with no page guide', () => {
    expect(buildPageSteps('/nope')).toEqual([])
  })
})
