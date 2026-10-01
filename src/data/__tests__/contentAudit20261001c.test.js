import { describe, it, expect } from 'vitest'
import { getEntryById, getAllTopics, searchKnowledge } from '../cikguKnowledge'

// Content-truth pins from the 2026-10-01 audit of the NON-imbuhan entries of
// src/data/cikguKnowledge.js (GOAL #60 file 3/7,
// docs/research/2026-10-01-cikgu-other-content-audit.md) plus two driver-
// verified imbuhan fixes (PRPM from the Mac, Kamus Dewan Edisi Keempat).
// Entry ids never change.

const OTHER_IDS = ['tense-markers', 'kata-hubung', 'ayat-aktif-pasif', 'ayat-majmuk', 'kata-sendi',
  'penjodoh-bilangan', 'kata-ganda', 'golongan-kata', 'penulisan-essay', 'formal-vs-informal',
  'penulisan-rencana', 'penulisan-laporan', 'penulisan-syarahan', 'lisan-paper3', 'lisan-roleplay-tips',
  'peribahasa', 'exam-paper1', 'exam-paper2', 'exam-paper3', 'vocab-keluarga', 'vocab-sekolah',
  'vocab-formal-upgrade', 'common-mistakes']

describe('cikguKnowledge non-imbuhan entries — lines a learner can trust', () => {
  it('all 23 audited entries still exist under their ids and every `related` id resolves', () => {
    const ids = new Set()
    for (const list of Object.values(getAllTopics())) for (const e of list) ids.add(e.id)
    expect(ids.size).toBeGreaterThanOrEqual(33)
    for (const id of OTHER_IDS) {
      const entry = getEntryById(id)
      expect(entry, id).toBeTruthy()
      for (const r of entry.related) expect(ids.has(r), `${id} → ${r}`).toBe(true)
    }
  })

  it('Paper 3 roleplay phrases are exam register: ingin membeli / ingin memesan / hendak, not "nak" or English "order"', () => {
    // Kamus Dewan: nak = bp (colloquial) hendak; memesan = "meminta supaya dibawakan, menempah".
    // KD4's only "order" is the biology taxon ("kategori pengelasan benda hidup, sebelum famili").
    // The entry's own related entry (formal-vs-informal) tells learners to avoid both.
    const a = getEntryById('lisan-roleplay-tips').answer
    expect(a).not.toMatch(/\bnak\b/)
    for (const phrase of a.match(/"[^"\n]+"/g) ?? []) expect(phrase).not.toMatch(/\border\b/) // no quoted Malay phrase uses English "order"
    expect(a).toContain('"Saya ingin membeli..."')
    expect(a).toContain('"Saya ingin memesan..."')
    expect(a).toContain('"Bagaimana hendak pergi ke ...?"')
  })

  it('"bagus" is standard Malay (KD4: "bersifat baik lagi memuaskan hati, sangat baik"), not an informal word to replace', () => {
    const a = getEntryById('formal-vs-informal').answer
    expect(a).not.toMatch(/best \/ bagus/)
    expect(a).toMatch(/\| best \| bagus \/ sangat baik \|/)
    // lisan-paper3 recommends bagus as a synonym — the two entries must agree.
    expect(getEntryById('lisan-paper3').answer).toContain('"bagus"')
  })

  it('peribahasa bank uses the Kamus Dewan form "Sedikit-sedikit, lama-lama menjadi bukit" (sikit = bp) and still matches a colloquial query', () => {
    const e = getEntryById('peribahasa')
    expect(e.answer).toContain('**"Sedikit-sedikit, lama-lama menjadi bukit"**')
    expect(e.answer).not.toMatch(/sikit-sikit/i)
    expect(e.keywords).toContain('sikit-sikit lama-lama jadi bukit')
    expect(e.keywords).toContain('sedikit-sedikit lama-lama menjadi bukit')
    expect(searchKnowledge('maksud sedikit-sedikit lama-lama menjadi bukit')[0].entry.id).toBe('peribahasa')
    expect(searchKnowledge('maksud sikit-sikit lama-lama jadi bukit')[0].entry.id).toBe('peribahasa')
  })

  it('"mencurah air ke daun keladi" = advice that is not taken in (Kamus Dewan: nasihat yang tidak dapat meresap ke dalam hati), not generic "futile effort"', () => {
    const line = getEntryById('peribahasa').answer.split('\n').find(l => l.includes('daun keladi'))
    expect(line).toMatch(/advice/i)
    expect(line).toMatch(/not taken in|will not listen/i)
    expect(line).not.toMatch(/→ \*\*wasted, futile effort\*\*/)
  })

  it('checked-and-cleared peribahasa meanings keep their DBP sense', () => {
    const a = getEntryById('peribahasa').answer
    expect(a).toMatch(/aur dengan tebing.*mutual help/i) // DBP: tolong-menolong antara satu sama lain
    expect(a).toMatch(/Melentur buluh.*from a young age/i) // DBP: mendidik anak biarlah sejak kecil lagi
    expect(a).toMatch(/Sediakan payung.*before trouble comes/i) // DBP: berjaga-jaga sebelum mendapat bencana
    expect(a).toMatch(/Alah bisa.*familiarity/i) // DBP: kerja yg susah menjadi senang kalau selalu dibuat
    expect(a).toMatch(/isi dengan kuku.*inseparable/i) // DBP: sangat karib
  })

  it('"Tepuk dada, tanya selera" is a peribahasa (DBP: fikirkan baik-baik menurut keyakinan sendiri), not a rhetorical question', () => {
    const a = getEntryById('penulisan-syarahan').answer
    expect(a).not.toMatch(/rhetorical questions \("Tepuk dada/)
    expect(a).toMatch(/rhetorical questions \("Adakah /)
    expect(a).toMatch(/a peribahasa \("Tepuk dada, tanya selera"/)
  })

  it('naskhah counts books / magazines / newspapers (KD4), so the example is senaskhah majalah — a letter is sepucuk surat', () => {
    const a = getEntryById('penjodoh-bilangan').answer
    expect(a).not.toContain('senaskhah surat')
    expect(a).toContain('senaskhah majalah')
    expect(a).toContain('sepucuk surat')
  })

  it('Paper 4 word counts are the 0546 (2025–27) ones — Q2 80–90 words, Q3 130–140 — never "200-300"', () => {
    for (const id of ['penulisan-essay', 'penulisan-rencana', 'exam-paper2']) {
      const a = getEntryById(id).answer
      expect(a, id).not.toMatch(/200\s*[-–]\s*300/)
      expect(a, id).toContain('130–140')
    }
    expect(getEntryById('penulisan-essay').answer).toContain('80–90')
    const p4 = getEntryById('exam-paper2').answer
    expect(p4).toContain('80–90')
    expect(p4).not.toMatch(/Choose 1 topic from several options/)
    expect(p4).toMatch(/form-filling/i)
    // The time plan budgets all three tasks, not 60 minutes on one chosen essay (reviewer finding).
    expect(p4).not.toMatch(/35 min: Write the essay/)
    for (const q of ['Q1', 'Q2', 'Q3']) expect(p4).toMatch(new RegExp(`- \\d+ min: ${q}`))
    expect(p4).not.toMatch(/Included 1-2 peribahasa/)
    // Structure advice is scoped to the 130–140-word task, not sold as "5 paragraphs" for an 80–90-word one.
    expect(getEntryById('penulisan-essay').answer).not.toMatch(/5-paragraph format/)
    expect(getEntryById('penulisan-essay').answer).toMatch(/Structure \(Q3 extended writing, 130–140 words/)
    expect(getEntryById('penulisan-rencana').answer).not.toMatch(/3 to 4 paragraphs/)
  })
})

// Driver-verified on PRPM from the Mac 2026-10-01 (Kamus Dewan Edisi Keempat).
describe('cikguKnowledge imbuhan entries — two driver-verified fixes', () => {
  it('pem- + f example is pemfitnah (KD4: orang yg membuat fitnah); "pemfoto" has no PRPM entry', () => {
    const line = getEntryById('imbuhan-pen').answer.split('\n').find(l => l.startsWith('- pem- before b, f'))
    expect(line).toContain('pemfitnah')
    expect(line).not.toContain('pemfoto')
  })

  it('meninggali is a word (KD4: menduduki, mendiami) — the line no longer reads as if it "becomes" mendiami', () => {
    const a = getEntryById('imbuhan-i').answer
    expect(a).toContain('tinggal → meninggali (to inhabit, = mendiami)')
    expect(a).not.toContain('meninggali → mendiami')
  })
})
