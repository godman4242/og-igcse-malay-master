import { describe, it, expect } from 'vitest'
import { WRITING_TASKS, tasksForFormat, getTask } from '../writingTasks.js'
import { FORMATS } from '../../lib/writingFormats.js'

const FORMAT_IDS = new Set(FORMATS.map(f => f.id))

describe('writingTasks catalogue', () => {
  it('has at least 2 English tasks', () => {
    expect(WRITING_TASKS.filter(t => t.lang === 'eng').length).toBeGreaterThanOrEqual(2)
  })
  it('every task is well-formed and points at a real format', () => {
    for (const t of WRITING_TASKS) {
      expect(t.lang).toBe('eng')                       // v1 = English only
      expect(FORMAT_IDS.has(t.formatId)).toBe(true)    // resolves in FORMATS
      expect(typeof t.prompt).toBe('string'); expect(t.prompt.length).toBeGreaterThan(20)
      expect(Array.isArray(t.requirements)).toBe(true); expect(t.requirements.length).toBeGreaterThanOrEqual(2)
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
