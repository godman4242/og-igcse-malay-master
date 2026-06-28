import { describe, it, expect } from 'vitest'
import { WRITING_TASKS, tasksForFormat, getTask } from '../writingTasks.js'
import { FORMATS } from '../../lib/writingFormats.js'

const FORMAT_IDS = new Set(FORMATS.map(f => f.id))
const MALAY_FORMAT_IDS = new Set(FORMATS.filter(f => f.lang === 'malay').map(f => f.id))

describe('writingTasks catalogue', () => {
  it('has at least 2 English tasks', () => {
    expect(WRITING_TASKS.filter(t => t.lang === 'eng').length).toBeGreaterThanOrEqual(2)
  })
  it('every task is well-formed and points at a real format', () => {
    for (const t of WRITING_TASKS) {
      expect(['eng', 'malay']).toContain(t.lang)       // English 0510 + Malay 0546
      expect(FORMAT_IDS.has(t.formatId)).toBe(true)    // resolves in FORMATS
      expect(typeof t.prompt).toBe('string'); expect(t.prompt.length).toBeGreaterThan(20)
      expect(Array.isArray(t.requirements)).toBe(true); expect(t.requirements.length).toBeGreaterThanOrEqual(2)
    }
  })
  it('has at least 3 Malay (0546) tasks, each pointing at a real Malay format', () => {
    const malay = WRITING_TASKS.filter(t => t.lang === 'malay')
    expect(malay.length).toBeGreaterThanOrEqual(3)
    for (const t of malay) {
      expect(MALAY_FORMAT_IDS.has(t.formatId)).toBe(true)        // a malay-lang format
      expect(tasksForFormat(t.formatId, 'malay')).toContainEqual(expect.objectContaining({ id: t.id }))
    }
  })
  it('ids are unique; lookups work', () => {
    const ids = WRITING_TASKS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(getTask(ids[0])).toMatchObject({ id: ids[0] })
    expect(getTask('nope')).toBe(null)
    expect(tasksForFormat(WRITING_TASKS[0].formatId, 'eng').length).toBeGreaterThanOrEqual(1)
  })
})

describe('writingTasks — how-to-fix hints (act-on-feedback loop)', () => {
  it('every task has a hint for every requirement, index-aligned', () => {
    for (const task of WRITING_TASKS) {
      expect(Array.isArray(task.hints)).toBe(true)
      expect(task.hints.length).toBe(task.requirements.length)
      for (const h of task.hints) {
        expect(typeof h).toBe('string')
        expect(h.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
