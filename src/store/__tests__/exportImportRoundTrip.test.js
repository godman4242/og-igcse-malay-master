// @vitest-environment jsdom
//
// P2-C6 regression: a Settings backup (exportData) imported on another device
// (importData) must round-trip EVERY persisted user field. The old code derived
// the two sides from hand-maintained literal lists that had drifted apart —
// exportData omitted examAttempts / guide / pdfReader / examRehearsalLang, and
// importData ignored the exported `ai` — so device migration silently dropped
// exam history, tour progress, reader prefs and AI history. The fix derives both
// sides from ONE shared key list so a new field can't be forgotten again.

import { describe, it, expect, vi } from 'vitest'

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

import useStore from '../useStore'

const DEFAULT_PDF = { layoutView: false, sentenceRender: 'inline', autoHelpDensePages: false, ocrLang: 'ms', visionConsent: false }
const DEFAULT_AI = { dailyCalls: 0, dailyCallsDate: null, roleplayHistory: [], cikguHistory: [] }

describe('exportData / importData round-trip (P2-C6)', () => {
  it('round-trips the fields the old export/import dropped', () => {
    const seeded = {
      examAttempts: [{ id: 'a1', ts: 123, passageId: 'p1', lang: 'ms', comprehensionPct: 80, writingBand: 5, speakingBand: 4, readinessScore: 70, durationSec: 1800 }],
      guide: { seenQuick: true, seenFull: true },
      pdfReader: { layoutView: true, sentenceRender: 'sheet', autoHelpDensePages: true, ocrLang: 'en', visionConsent: true },
      examRehearsalLang: 'en',
      ai: { dailyCalls: 9, dailyCallsDate: '2026-06-13', roleplayHistory: [{ scenarioId: 's', turns: 5, score: 8, date: 'x' }], cikguHistory: [{ role: 'user', content: 'hi', timestamp: 1 }] },
    }
    useStore.setState(seeded)

    const exported = useStore.getState().exportData()

    // Wipe those fields back to their defaults (simulates a fresh device).
    useStore.setState({
      examAttempts: [],
      guide: { seenQuick: false, seenFull: false },
      pdfReader: { ...DEFAULT_PDF },
      examRehearsalLang: 'ms',
      ai: { ...DEFAULT_AI },
    })

    // Restore from the backup.
    useStore.getState().importData(exported)

    const s = useStore.getState()
    expect(s.examAttempts).toEqual(seeded.examAttempts)
    expect(s.guide).toEqual(seeded.guide)
    expect(s.pdfReader).toEqual(seeded.pdfReader)
    expect(s.examRehearsalLang).toBe('en')
    expect(s.ai).toEqual(seeded.ai)
  })

  it("imports an OLD backup file missing the new keys without throwing (per-field defaults)", () => {
    const oldFile = { cards: [], streak: { count: 3, last: '2026-06-10' } } // pre-fix shape
    expect(() => useStore.getState().importData(oldFile)).not.toThrow()
    const s = useStore.getState()
    expect(s.streak).toEqual({ count: 3, last: '2026-06-10' })
    // Missing keys fall back to defaults instead of becoming undefined.
    expect(s.examAttempts).toEqual([])
    expect(s.guide).toEqual({ seenQuick: false, seenFull: false })
    expect(s.pdfReader.ocrLang).toBe('ms')
    expect(s.ai).toEqual(DEFAULT_AI)
  })
})

// Census A5 (2026-08-06): `grammarStats` is persisted and rendered on the
// Dashboard, but was missing from makeBackupDefaults() — so BACKUP_KEYS omitted
// it and a backup restored on a new phone silently reset the whole grammar
// panel to "0 drills completed · 0% accuracy" while the SCHEDULE (grammarCards)
// came across, which reads as data loss rather than a fresh start.
//
// The targeted assertion below is paired with a DRIFT GUARD, because this is
// the second time this list has silently diverged (P2-C6 above was the first).
// src/store/CLAUDE.md names the fields that must NOT cross devices; anything
// persisted and not on that list belongs in the backup.
describe('backup completeness (census A5)', () => {
  const NEVER_BACKED_UP = new Set([
    // Device/session-local by design — see src/store/CLAUDE.md "Persistence / backup".
    'sync', 'auth', 'installPrompt', 'lastMutationAt', 'userRole',
    'reviewedToday', 'lastStudyDate', 'activeDeck',
    // zustand/persist's own schema marker. Restoring a file's `_version` would
    // overwrite the receiving device's migration state — it must stay local.
    '_version',
  ])

  it('backs up grammarStats', () => {
    expect(Object.keys(useStore.getState().exportData())).toContain('grammarStats')
  })

  it('backs up every persisted field that is not deliberately device-local', () => {
    const state = useStore.getState()
    const persisted = Object.keys(state).filter(k => typeof state[k] !== 'function')
    const backedUp = new Set(Object.keys(state.exportData()))
    const dropped = persisted.filter(k => !backedUp.has(k) && !NEVER_BACKED_UP.has(k))
    expect(dropped).toEqual([])
  })
})
