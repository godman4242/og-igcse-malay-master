// Well-formedness gate for the MALAY over-praise gold set (Malay 0546 mirror of
// goldWritingTasksEn.test.js). Runs in the UNIT gate (src/**/__tests__/**), so it
// lives under src/. It imports the pure gold-data array from scripts/ (no Node
// resolver needed — the array has no imports) and `getTask` from the real task
// catalogue, and asserts the gold set is structurally sound, points at REAL Malay
// tasks, and is weighted toward the subtle cases the eval exists to catch. The
// keyed eval RUN itself is manual (owner's Gemini key).
import { describe, it, expect } from 'vitest'
import { WRITING_TASKS_GOLD_MS } from '../../../scripts/ai-tier-eval/goldWritingTasksMs.mjs'
import { getTask } from '../writingTasks.js'

const LABELS = ['onTask', 'partial', 'offTopicFluent']
const CEILING_BY_LABEL = { onTask: 6, partial: 4, offTopicFluent: 2 }

describe('goldWritingTasksMs (Malay over-praise gold set)', () => {
  it('every gold essay points at a real MALAY task and has a valid label + ceiling + real text', () => {
    expect(WRITING_TASKS_GOLD_MS.length).toBe(10)
    const ids = new Set()
    for (const g of WRITING_TASKS_GOLD_MS) {
      const task = getTask(g.taskId)
      expect(task).not.toBe(null)                          // resolves to an authored task
      expect(task.lang).toBe('malay')                      // and it is a Malay 0546 task
      expect(LABELS).toContain(g.label)
      expect(g.expectedContentMax).toBeGreaterThanOrEqual(1)
      expect(typeof g.text).toBe('string')
      expect(g.text.length).toBeGreaterThan(40)            // a genuine answer, not a stub
      expect(typeof g.id).toBe('string')
      expect(ids.has(g.id)).toBe(false)                    // ids are unique
      ids.add(g.id)
    }
  })

  it('expectedContentMax matches the label ceiling (offTopicFluent→2, partial→4, onTask→6)', () => {
    for (const g of WRITING_TASKS_GOLD_MS) {
      expect(g.expectedContentMax).toBe(CEILING_BY_LABEL[g.label])
    }
  })

  it('is weighted toward subtle cases (partial + offTopicFluent are the majority)', () => {
    const subtle = WRITING_TASKS_GOLD_MS.filter(g => g.label !== 'onTask').length
    expect(subtle).toBeGreaterThan(WRITING_TASKS_GOLD_MS.length / 2)
  })

  it('has the planned distribution: 3 onTask, 4 partial, 3 offTopicFluent', () => {
    const count = (label) => WRITING_TASKS_GOLD_MS.filter(g => g.label === label).length
    expect(count('onTask')).toBe(3)
    expect(count('partial')).toBe(4)
    expect(count('offTopicFluent')).toBe(3)
  })
})
