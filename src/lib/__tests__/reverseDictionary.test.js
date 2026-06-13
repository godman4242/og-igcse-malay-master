import { describe, it, expect } from 'vitest'
import { buildEnDictionary } from '../reverseDictionary'

describe('buildEnDictionary', () => {
  it('reverses malay→english into english→malay', () => {
    const { entries } = buildEnDictionary({ abang: 'older brother', rumah: 'house' })
    expect(entries['house']).toBe('rumah')
    expect(entries['older brother']).toBe('abang') // 2-word collocation kept
  })

  it('joins many-to-one collisions with " / " (capped at 3)', () => {
    const { entries } = buildEnDictionary({ lihat: 'to look', pandang: 'to look', tengok: 'to look', tatap: 'to look' })
    expect(entries['to look'].split(' / ')).toHaveLength(3)
  })

  it('drops function-word definitions containing a slash', () => {
    const { entries, stats } = buildEnDictionary({ adalah: 'is/are' })
    expect(entries['is/are']).toBeUndefined()
    expect(stats.droppedSlash).toBe(1)
  })

  it('drops glosses longer than 2 words', () => {
    const { entries, stats } = buildEnDictionary({ x: 'a very long phrase here' })
    expect(Object.keys(entries)).toHaveLength(0)
    expect(stats.droppedMultiWord).toBe(1)
  })

  it('reports a stats summary', () => {
    const { stats } = buildEnDictionary({ rumah: 'house', adalah: 'is/are' })
    expect(stats).toMatchObject({ source: 2, kept: 1, droppedSlash: 1 })
  })
})
