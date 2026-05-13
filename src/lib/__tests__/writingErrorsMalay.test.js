import { describe, it, expect } from 'vitest'
import { findIssuesMalay, summariseIssuesMalay, ERROR_TYPES_MS } from '../writingErrorsMalay.js'

const idsOf = (findings) => findings.map(f => f.id)
const findingFor = (findings, id, contains) =>
  findings.find(f => f.id === id && (!contains || (f.message + ' ' + (f.suggestion || '')).toLowerCase().includes(contains.toLowerCase())))

describe('findIssuesMalay — imbuhan errors', () => {
  it.each([
    ['mempukul', 'memukul'],
    ['mengkira', 'mengira'],
    ['mensapu', 'menyapu'],
    ['mentulis', 'menulis'],
    ['merubah', 'mengubah'],
    ['mempertingkatkan', 'meningkatkan'],
  ])('%s → %s flagged with imbuhan id', (wrong, right) => {
    const f = findIssuesMalay(`Saya ${wrong} bola di padang.`)
    const hit = findingFor(f, 'imbuhan', right)
    expect(hit, `expected an 'imbuhan' finding suggesting "${right}"`).toBeTruthy()
    expect(hit.severity).toBe('high')
  })
})

describe('findIssuesMalay — preposition errors', () => {
  it.each([
    ['dari pada', 'daripada'],
    ['ke pada', 'kepada'],
    ['disamping', 'di samping'],
    ['dibawah', 'di bawah'],
    ['walaubagaimanapun', 'walau bagaimanapun'],
  ])('%s → %s flagged', (wrong, right) => {
    const f = findIssuesMalay(`Cikgu kata ${wrong} pelajar harus belajar.`)
    const hit = findingFor(f, 'preposition-ms', right)
    expect(hit, `expected preposition-ms finding suggesting "${right}"`).toBeTruthy()
  })
})

describe('findIssuesMalay — slang gated by formal format', () => {
  it('flags "tak/nak/dah/macam" inside a formal letter context', () => {
    const text = 'Dengan hormatnya, saya tak nak pergi. Macam tu lah.'
    const f = findIssuesMalay(text, { formatId: 'ms-surat-rasmi' })
    const ids = idsOf(f)
    const slangHits = ids.filter(id => id.startsWith('slang-'))
    expect(slangHits.length).toBeGreaterThan(0)
  })

  it('does NOT flag the same slang when no formal format is set', () => {
    const text = 'Aku tak nak pergi macam tu lah.'
    const f = findIssuesMalay(text) // no formatId
    const slangHits = idsOf(f).filter(id => id.startsWith('slang-'))
    expect(slangHits).toHaveLength(0)
  })
})

describe('findIssuesMalay — reduplication safety', () => {
  it('treats "kanak-kanak" as a single token (does not flag repeated word)', () => {
    const text = 'Kanak-kanak itu sedang bermain di taman permainan.'
    const f = findIssuesMalay(text)
    const repeated = f.find(x => x.id === 'repeated-word')
    expect(repeated).toBeUndefined()
  })
})

describe('findIssuesMalay — finding shape', () => {
  it('every finding has required fields and a known type', () => {
    const text = 'Saya mempukul bola di sekolah dengan dari pada kawan saya.'
    const f = findIssuesMalay(text)
    expect(f.length).toBeGreaterThan(0)
    for (const finding of f) {
      expect(finding).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        severity: expect.stringMatching(/^(high|medium|low)$/),
        start: expect.any(Number),
        end: expect.any(Number),
        message: expect.any(String),
      })
      expect(finding.start).toBeGreaterThanOrEqual(0)
      expect(finding.end).toBeGreaterThan(finding.start)
      expect(finding.end).toBeLessThanOrEqual(text.length)
      expect(ERROR_TYPES_MS).toContain(finding.type)
    }
  })
})

describe('summariseIssuesMalay', () => {
  it('counts severities and types correctly', () => {
    const f = findIssuesMalay('Saya mempukul bola dengan dari pada kawan saya.')
    const s = summariseIssuesMalay(f)
    expect(s.counts.total).toBe(f.length)
    expect(s.counts.high + s.counts.medium + s.counts.low).toBe(f.length)
  })
})

describe('findIssuesMalay — calibration negatives', () => {
  it('clean rencana yields zero high-severity findings', () => {
    const text = `Dewasa ini, penggunaan media sosial dalam kalangan remaja semakin meluas. Pertamanya, media sosial menyediakan ruang bagi remaja untuk berkomunikasi dengan rakan-rakan mereka. Selain itu, platform tersebut menjadi sumber maklumat yang pantas dan mudah diakses.

Walau bagaimanapun, terdapat juga kesan negatif yang perlu diberi perhatian. Sebagai contoh, remaja yang menghabiskan terlalu banyak masa di media sosial sering mengabaikan tugasan sekolah. Justeru, ibu bapa dan guru perlu memainkan peranan masing-masing untuk membimbing remaja menggunakan media sosial dengan bijak.

Kesimpulannya, media sosial mempunyai dua sisi yang berbeza. Penggunaannya yang seimbang dan bertanggungjawab akan membawa banyak manfaat kepada generasi muda.`
    const f = findIssuesMalay(text, { formatId: 'ms-rencana' })
    const high = f.filter(x => x.severity === 'high')
    expect(high).toHaveLength(0)
  })
})

describe('findIssuesMalay — empty/edge inputs', () => {
  it('returns [] for empty', () => {
    expect(findIssuesMalay('')).toEqual([])
    expect(findIssuesMalay('   ')).toEqual([])
  })
})
