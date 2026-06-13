// Per-paper balance meter (review feature #7) — skillActivity store slice.
// STORE_VERSION 30→31 adds a persisted skillActivity log
// ({ 'YYYY-MM-DD': { reading: N, listening: N, grammar: N } }, LOCAL-day keyed)
// + logSkillActivity(skill). Only the surfaces with no existing history array
// log here (Reading / Listening / Grammar); Writing / Speaking / Exam / Vocab
// derive from their existing slices in lib/skillBalance.js.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore, { STORE_VERSION } from '../useStore'
import { getTodayISO } from '../../lib/localDay'

describe('skillActivity slice (v31)', () => {
  beforeEach(() => {
    useStore.setState({
      skillActivity: {},
      triggerCloudSync: () => {},
      lastMutationAt: '2020-01-01T00:00:00.000Z',
    })
  })

  it('STORE_VERSION is at least 31', () => {
    expect(STORE_VERSION).toBeGreaterThanOrEqual(31)
  })

  it('initial state has an empty skillActivity log', () => {
    expect(useStore.getInitialState().skillActivity).toEqual({})
  })

  it('logSkillActivity increments today (local day key) for a valid skill', () => {
    useStore.getState().logSkillActivity('reading')
    const today = getTodayISO()
    expect(useStore.getState().skillActivity[today]).toEqual({ reading: 1 })
    useStore.getState().logSkillActivity('reading')
    useStore.getState().logSkillActivity('listening')
    expect(useStore.getState().skillActivity[today]).toEqual({ reading: 2, listening: 1 })
  })

  it('ignores unknown skills (never persists garbage keys)', () => {
    useStore.getState().logSkillActivity('bogus')
    useStore.getState().logSkillActivity(undefined)
    expect(useStore.getState().skillActivity).toEqual({})
  })

  it('prunes day keys older than 30 days on write', () => {
    useStore.setState({
      skillActivity: {
        '2020-05-05': { reading: 4 }, // ancient — pruned
        [getTodayISO()]: { grammar: 1 },
      },
    })
    useStore.getState().logSkillActivity('listening')
    const log = useStore.getState().skillActivity
    expect(log['2020-05-05']).toBeUndefined()
    expect(log[getTodayISO()]).toEqual({ grammar: 1, listening: 1 })
  })

  it('stamps lastMutationAt (funnels through commitPrefMutation)', () => {
    const before = useStore.getState().lastMutationAt
    useStore.getState().logSkillActivity('grammar')
    expect(useStore.getState().lastMutationAt).not.toBe(before)
  })

  it('round-trips through export/import (registered in BACKUP_KEYS)', () => {
    useStore.getState().logSkillActivity('reading')
    const backup = useStore.getState().exportData()
    expect(backup.skillActivity).toEqual(useStore.getState().skillActivity)
    expect(backup.skillActivity).not.toEqual({})
  })
})
