import { describe, it, expect } from 'vitest'
import {
  CONNECTOR_GROUPS_MS,
  detectConnectors,
  connectorCoverage,
} from '../connectors.js'

describe('detectConnectors', () => {
  it('returns an empty set for empty / non-string input', () => {
    expect(detectConnectors('').size).toBe(0)
    expect(detectConnectors(null).size).toBe(0)
    expect(detectConnectors(undefined).size).toBe(0)
    expect(detectConnectors(42).size).toBe(0)
  })

  it('detects single-token connectors with word boundaries', () => {
    const used = detectConnectors('Saya pergi ke sekolah. Walaupun hujan, saya berjaya.')
    expect(used.has('walaupun')).toBe(true)
    // Substring guard: "tetapi" inside "tetapinya" (made-up) should NOT match.
    expect(detectConnectors('tetapinya hujan').has('tetapi')).toBe(false)
  })

  it('detects multi-word connectors with flexible whitespace', () => {
    const used = detectConnectors('Selain itu, pelajar perlu rajin.\nWalau   bagaimanapun, masa terhad.')
    expect(used.has('selain-itu')).toBe(true)
    expect(used.has('walau-bagaimanapun')).toBe(true)
  })

  it('accepts registered spelling variants', () => {
    // walaubagaimanapun (one word) is a registered variant.
    expect(detectConnectors('Walaubagaimanapun, kami bersetuju.').has('walau-bagaimanapun')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(detectConnectors('OLEH ITU, kita perlu bertindak.').has('oleh-itu')).toBe(true)
    expect(detectConnectors('kesimpulannya jelas').has('kesimpulannya')).toBe(true)
  })
})

describe('connectorCoverage', () => {
  it('returns a row per group with used/total counts', () => {
    const cov = connectorCoverage('Selain itu, tambahan pula, kesimpulannya saya bersetuju.')
    expect(cov).toHaveLength(CONNECTOR_GROUPS_MS.length)
    const addition = cov.find(c => c.id === 'addition')
    expect(addition.used).toBeGreaterThanOrEqual(2)
    expect(addition.total).toBe(CONNECTOR_GROUPS_MS.find(g => g.id === 'addition').items.length)
    const sequence = cov.find(c => c.id === 'sequence')
    expect(sequence.used).toBeGreaterThanOrEqual(1)
  })

  it('reports zero usage for an essay with no connectors', () => {
    const cov = connectorCoverage('Saya makan nasi. Dia minum air. Hari ini cerah.')
    expect(cov.every(c => c.used === 0)).toBe(true)
  })
})
