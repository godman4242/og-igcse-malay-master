// Well-formedness gate for the over-praise gold set (Task 4).
//
// This runs in the UNIT gate (vitest include glob = src/**/__tests__/**), so it
// must live under src/ — a test under scripts/** would NEVER run. It imports the
// pure gold-data array from scripts/ (no Node resolver needed — the array has no
// imports) and `getTask` from the real task catalogue, and asserts the gold set
// is structurally sound + weighted toward the subtle cases the eval exists to
// catch. The keyed eval RUN itself is manual (Task 5, owner's Gemini key).
import { describe, it, expect } from 'vitest'
import { WRITING_TASKS_GOLD } from '../../../scripts/ai-tier-eval/goldWritingTasksEn.mjs'
import { getTask } from '../writingTasks.js'

const LABELS = ['onTask', 'partial', 'offTopicFluent']
// expectedContentMax ceiling per label — the over-praise gate encodes these.
const CEILING_BY_LABEL = { onTask: 6, partial: 4, offTopicFluent: 2 }

describe('goldWritingTasksEn (over-praise gold set)', () => {
  it('every gold essay points at a real task and has a valid label + expectedContentMax + real text', () => {
    expect(WRITING_TASKS_GOLD.length).toBe(10)
    const ids = new Set()
    for (const g of WRITING_TASKS_GOLD) {
      expect(getTask(g.taskId)).not.toBe(null)            // resolves to an authored task
      expect(LABELS).toContain(g.label)                    // label in enum
      expect(g.expectedContentMax).toBeGreaterThanOrEqual(1)
      expect(typeof g.text).toBe('string')
      expect(g.text.length).toBeGreaterThan(40)            // a genuine answer, not a stub
      expect(typeof g.id).toBe('string')
      expect(ids.has(g.id)).toBe(false)                    // ids are unique
      ids.add(g.id)
    }
  })

  it('expectedContentMax matches the label ceiling (offTopicFluent→2, partial→4, onTask→6)', () => {
    for (const g of WRITING_TASKS_GOLD) {
      expect(g.expectedContentMax).toBe(CEILING_BY_LABEL[g.label])
    }
  })

  it('is weighted toward subtle cases (partial + offTopicFluent are the majority)', () => {
    const subtle = WRITING_TASKS_GOLD.filter(g => g.label !== 'onTask').length
    expect(subtle).toBeGreaterThan(WRITING_TASKS_GOLD.length / 2)
  })

  it('has the planned distribution: 3 onTask, 4 partial, 3 offTopicFluent', () => {
    const count = (label) => WRITING_TASKS_GOLD.filter(g => g.label === label).length
    expect(count('onTask')).toBe(3)
    expect(count('partial')).toBe(4)
    expect(count('offTopicFluent')).toBe(3)
  })
})
