import { describe, it, expect } from 'vitest'
import { score, listFormats, autoDetectFormat } from '../writingGrader.js'
import { findIssuesMalay } from '../writingErrorsMalay.js'

describe('listFormats', () => {
  it('returns english + malay formats by default, filterable by lang', () => {
    const all = listFormats()
    expect(all.length).toBeGreaterThan(20)
    const eng = listFormats('eng')
    const malay = listFormats('malay')
    expect(eng.every(f => f.lang === 'eng')).toBe(true)
    expect(malay.every(f => f.lang === 'malay')).toBe(true)
    expect(eng.length + malay.length).toBe(all.length)
  })
})

describe('autoDetectFormat', () => {
  it('detects formal English letter from markers', () => {
    const text = `Dear Sir,\n\nI am writing to apply for the position. I look forward to hearing from you.\n\nYours faithfully,\nAisha`
    const r = autoDetectFormat(text, 'eng')
    expect(r.format).toBeTruthy()
    expect(r.format.id).toBe('eng-letter-formal')
    expect(r.confidence).toBeGreaterThan(0)
  })

  it('detects Malay rencana from discourse markers', () => {
    const text = 'Pertamanya, isu ini penting. Selain itu, ia menjejaskan masyarakat. Akhir sekali, kesimpulannya kita perlu bertindak.'
    const r = autoDetectFormat(text, 'malay')
    expect(r.format?.id).toBe('ms-rencana')
  })
})

describe('score — input validation', () => {
  it('returns too-short error for empty / very short input', () => {
    const r = score('', { lang: 'eng' })
    expect(r.error).toBe('too-short')
  })

  it('Malay too-short message is in Malay', () => {
    const r = score('Hai.', { lang: 'malay' })
    expect(r.error).toBe('too-short')
    expect(r.message).toMatch(/[Tt]ulis/)
  })
})

describe('score — English shape & banding', () => {
  const cleanLetter = `Dear Sir,

I am writing to apply for the position of summer intern at your firm. Firstly, I have recently completed my IGCSE examinations with strong results. Furthermore, I have developed analytical skills and I am comfortable working in a team. Consequently, I believe I would be a useful addition to your office during the holidays.

Moreover, I am genuinely interested in the work your organisation does and I would welcome the opportunity to learn from your colleagues. In addition, I have attached my CV for your consideration. I look forward to hearing from you at your earliest convenience.

Yours faithfully,
Aisha Rahman`

  it('returns full result shape for a clean essay', () => {
    const r = score(cleanLetter, { lang: 'eng', format: 'eng-letter-formal' })
    expect(r.error).toBeUndefined()
    expect(r.band).toBeGreaterThanOrEqual(1)
    expect(r.band).toBeLessThanOrEqual(6)
    expect(r.subBands).toMatchObject({
      content: expect.any(Number),
      accuracy: expect.any(Number),
      vocab: expect.any(Number),
      variety: expect.any(Number),
      cohesion: expect.any(Number),
      format: expect.any(Number),
    })
    for (const v of Object.values(r.subBands)) {
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
    expect(Array.isArray(r.tips)).toBe(true)
    expect(r.tips.length).toBeGreaterThan(0)
  })

  it('hard cap holds: overall ≤ accuracy + 1 on a noisy essay', () => {
    // Heavy on confusables + missing apostrophes + would-of.
    const noisy = `I would of gone to the shop but I dont know if its open. Their selling food cheaper then before. Me and my friend went their yesterday. We could of bought more but we lose track of time. Its a great place but the staff is rude and they dont care about customers. I would recommend it but you have to except the bad service.`.repeat(2)
    const r = score(noisy, { lang: 'eng', format: 'general' })
    expect(r.band).toBeLessThanOrEqual(r.subBands.accuracy + 1)
  })

  it('hard cap holds: overall ≤ content when word-count below format minimum × 0.6', () => {
    // Very short relative to article minWords (250 → cap below 150).
    const short = 'Furthermore, technology has changed our lives in many ways. However, we must use it wisely. In conclusion, balance matters.'
    const r = score(short, { lang: 'eng', format: 'eng-article' })
    expect(r.band).toBeLessThanOrEqual(r.subBands.content)
  })
})

describe('score — Malay shape & banding', () => {
  const cleanRencana = `Dewasa ini, penggunaan media sosial dalam kalangan remaja semakin meluas. Pertamanya, media sosial menyediakan ruang bagi remaja untuk berkomunikasi dengan rakan-rakan mereka. Selain itu, platform tersebut menjadi sumber maklumat yang pantas dan mudah diakses oleh sesiapa sahaja.

Tambahan pula, media sosial membolehkan remaja meluahkan kreativiti mereka melalui pelbagai medium seperti video, gambar, dan tulisan. Justeru, ramai remaja kini mempunyai peluang untuk berkongsi karya dengan khalayak yang lebih luas. Walau bagaimanapun, terdapat juga kesan negatif yang perlu diberi perhatian.

Akhir sekali, ibu bapa dan guru perlu memainkan peranan masing-masing untuk membimbing remaja. Kesimpulannya, media sosial mempunyai dua sisi yang berbeza dan penggunaannya yang seimbang akan membawa banyak manfaat kepada generasi muda.`

  it('returns full result shape with isMalay=true', () => {
    const r = score(cleanRencana, { lang: 'malay', format: 'ms-rencana' })
    expect(r.error).toBeUndefined()
    expect(r.isMalay).toBe(true)
    expect(r.band).toBeGreaterThanOrEqual(1)
    expect(r.band).toBeLessThanOrEqual(6)
    expect(r.formatLabel).toBe('Rencana / Artikel')
    expect(r.tips.length).toBeGreaterThan(0)
  })

  it('hard cap holds for noisy Malay essay', () => {
    const noisy = `Dengan hormatnya, saya nak cakap pasal isu ni. Aku rasa media sosial tu macam tak elok sangat. Pelajar mempukul rakan-rakan mereka dan mengkira masa di media sosial. Dari pada belajar, mereka main game je. Walaubagaimanapun, ibubapa pun tak peduli. Tak boleh cakap, kerena semua orang dah biasa macam ni.`.repeat(2)
    const r = score(noisy, { lang: 'malay', format: 'ms-surat-rasmi' })
    expect(r.band).toBeLessThanOrEqual(r.subBands.accuracy + 1)
  })
})

describe('score — no reward-and-flag contradiction (Malay)', () => {
  it('does not reward "sehinggakan" as sophisticated vocab — it is flagged as colloquial, not praised', () => {
    // Adversarial-review PLAUSIBLE finding (writingGrader "sehinggakan"): the Malay
    // error detector flags "sehinggakan" as colloquial (suggest "sehingga"), so the
    // grader must NOT also count it toward the sophisticated/formal-vocab tally — a
    // single word cannot be penalised and rewarded simultaneously.
    const flagged = findIssuesMalay('Dia berlatih sehinggakan dia berjaya dalam ujian itu.')
    expect(flagged.some(f => f.suggestion === 'sehingga' && (f.message || '').includes('sehinggakan'))).toBe(true)

    // Differential: toggling ONLY "sehinggakan" must not move the formal-vocab count.
    // (sehinggakan is in neither FORM_ML nor PW_ML, so formalCount = formal + sophisticated
    // isolates its sophistication contribution: +1 before the fix, 0 after.)
    const withWord = 'Dia berlatih dengan tekun sehinggakan dia berjaya dalam ujian bahasa itu.'
    const without = 'Dia berlatih dengan tekun dia berjaya dalam ujian bahasa itu.'
    const a = score(withWord, { lang: 'malay' })
    const b = score(without, { lang: 'malay' })
    expect(a.metrics.formalCount).toBe(b.metrics.formalCount)
  })
})

describe('score — format auto-detection wired through', () => {
  it('auto picks Malay rencana from a rencana-style essay', () => {
    const text = 'Pertamanya, isu ini penting. Selain itu, ia menjejaskan masyarakat. Tambahan pula, ramai yang terjejas. Akhir sekali, kesimpulannya kita perlu bertindak.'
    const r = score(text + ' ' + text + ' ' + text, { lang: 'malay', format: 'auto' })
    // Detected format should be set
    expect(r.detectedAuto).toBe(true)
    expect(r.format).toBe('ms-rencana')
  })
})
