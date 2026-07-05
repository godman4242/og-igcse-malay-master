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

// Semantic-grammar rules added 2026-06-13 to raise free-tier recall (eval went
// 0/24 → 15/24). Each rule is paired with a conservative guard proving it does
// NOT fire on the correct form — false positives damage learner confidence.
describe('findIssuesMalay — semantic grammar (recall lift + FP guards)', () => {
  it.each([
    ['mengamal', 'mengamalkan'],
    ['mengabai', 'mengabaikan'],
    ['menjejas', 'menjejaskan'],
    ['memusnah', 'memusnahkan'],
    ['menyinar', 'menyinari'],
  ])('meN- verb "%s" missing its suffix → suggests "%s"', (wrong, right) => {
    const f = findIssuesMalay(`Mereka ${wrong} sesuatu yang penting.`)
    expect(findingFor(f, 'imbuhan', right), `expected suggestion "${right}"`).toBeTruthy()
  })

  it('does NOT flag the correctly-suffixed forms', () => {
    const f = findIssuesMalay('Mereka mengamalkan dan mengabaikan serta menjejaskan dan menyinari sesuatu.')
    expect(idsOf(f)).not.toContain('imbuhan')
  })

  it('flags passive "di-" wrongly spaced ("di selesaikan" → "diselesaikan")', () => {
    const f = findIssuesMalay('Masalah ini akan di selesaikan dan nilai itu perlu di pupuk.')
    const hits = f.filter(x => x.id === 'passive-di-spacing')
    expect(hits.map(h => h.suggestion)).toEqual(expect.arrayContaining(['diselesaikan', 'dipupuk']))
  })

  it('does NOT flag locative "di" before a place, nor the joined verb', () => {
    const f = findIssuesMalay('Saya belajar di sekolah, di rumah, di dalam kelas. Ia telah diselesaikan dan dipupuk.')
    expect(idsOf(f)).not.toContain('passive-di-spacing')
  })

  it('flags comparison "lebih … dari" → daripada, but NOT spatial "dari"', () => {
    const flagged = findIssuesMalay('Kesihatan lebih penting dari hiburan.')
    expect(findingFor(flagged, 'preposition-ms', 'daripada')).toBeTruthy()
    // "jauh" is spatial — "dari" is correct there, must stay clean
    const clean = findIssuesMalay('Rumah saya lebih jauh dari sekolah.')
    expect(idsOf(clean)).not.toContain('preposition-ms')
  })

  it('flags "Oleh kerana itu" → "Oleh itu" (cohesion), leaves "Oleh itu" alone', () => {
    expect(findingFor(findIssuesMalay('Oleh kerana itu, kita perlu berhati-hati.'), 'cohesion-ms', 'oleh itu')).toBeTruthy()
    expect(idsOf(findIssuesMalay('Oleh itu, kita perlu berhati-hati.'))).not.toContain('cohesion-ms')
  })

  it('flags unambiguous English words in any format (quotes exempt)', () => {
    expect(idsOf(findIssuesMalay('Saya rasa happy sangat hari ini.', { formatId: 'general' }))).toContain('english-loanword')
    // inside quotes (dialogue) is exempt
    expect(idsOf(findIssuesMalay('Dia berkata, "I am happy".'))).not.toContain('english-loanword')
  })

  it('flags "tapi" as colloquial in formal formats', () => {
    const f = findIssuesMalay('Internet berguna. Tapi, ia ada keburukan.', { formatId: 'ms-rencana' })
    expect(idsOf(f)).toContain('slang-tapi')
  })
})

// P0 regression (2026-07-05): valid Kamus Dewan words were sitting in the
// MS_MISSPELLINGS map and flagged HIGH as "common misspelling" — confident-
// wrong Malay is this app's worst defect class. All three verified valid via
// PRPM (DBP official dictionary):
//   mengikuti     — to follow / attend (kelas, kursus)
//   mengikutkan   — menjadikan berikut / menyertakan
//   mengambilkan  — benefactive "take for" (ia mengambilkan anaknya buah)
describe('findIssuesMalay — valid words never flagged as misspellings (P0)', () => {
  it.each([
    ['mengikuti', 'Saya mengikuti kelas tambahan Bahasa Melayu setiap petang.'],
    ['mengikutkan', 'Guru mengikutkan nama pelajar itu dalam senarai peserta.'],
    ['mengambilkan', 'Ibu mengambilkan adik segelas air sejuk di dapur.'],
  ])('does not flag valid word "%s" as a misspelling', (word, sentence) => {
    const f = findIssuesMalay(sentence)
    const spellHits = f.filter(x => x.id === 'spell-' + word)
    expect(spellHits, `"${word}" is a valid Kamus Dewan word — it must produce no spelling finding`).toHaveLength(0)
  })
})
