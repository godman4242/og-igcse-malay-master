import { describe, it, expect } from 'vitest'
import { getEntryById, getRelatedEntries, getAllTopics } from '../cikguKnowledge'
import { IMBUHAN_DRILLS } from '../grammar'

// Content-truth pins from the 2026-10-01 audit of the IMBUHAN entries of
// src/data/cikguKnowledge.js (GOAL #60 file 2/7,
// docs/research/2026-10-01-cikgu-imbuhan-content-audit.md) plus one driver-
// verified grammar.js gloss. Entry ids never change.

const IMBUHAN_IDS = ['imbuhan-men', 'imbuhan-ber', 'imbuhan-di', 'imbuhan-ter', 'imbuhan-pen',
  'imbuhan-kan', 'imbuhan-i', 'imbuhan-an', 'imbuhan-ke-an', 'imbuhan-se']

describe('cikguKnowledge imbuhan entries — lines a learner can trust', () => {
  it('all 10 imbuhan entries still exist under their ids', () => {
    for (const id of IMBUHAN_IDS) expect(getEntryById(id)?.topic).toBe('imbuhan')
  })

  it('every `related` id resolves to a real entry (imbuhan-men / imbuhan-di pointed at a non-existent "imbuhan-passive")', () => {
    const ids = new Set()
    for (const list of Object.values(getAllTopics())) for (const e of list) ids.add(e.id)
    for (const id of IMBUHAN_IDS) {
      const entry = getEntryById(id)
      for (const r of entry.related) expect(ids.has(r), `${id} → ${r}`).toBe(true)
      expect(getRelatedEntries(id)).toHaveLength(entry.related.length)
    }
    expect(getEntryById('imbuhan-men').related).toContain('ayat-aktif-pasif')
    expect(getEntryById('imbuhan-di').related).toContain('ayat-aktif-pasif')
  })

  it('the -kan vs -i contrast uses attested words (memasukkan / memasuki), not the unattested "membersihi"', () => {
    // Kamus Dewan: memasuki = "masuk ke dlm sesuatu"; memasukkan = "membawa masuk".
    // "membersihi" has no PRPM / KBBI entry — a learner copying it writes a non-word.
    for (const id of ['imbuhan-kan', 'imbuhan-i']) {
      const a = getEntryById(id).answer
      expect(a).not.toMatch(/membersih\*?\*?i\b/)
      expect(a).toMatch(/memasuk\*\*i\*\* bilik/)
      expect(a).toMatch(/memasuk\*\*kan\*\* buku/)
    }
  })

  it('checked-and-cleared lines keep their verified words (Kamus Dewan via PRPM snippets)', () => {
    expect(getEntryById('imbuhan-men').answer).toContain('memfoto') // KD4: mengambil gambar dgn kamera
    expect(getEntryById('imbuhan-ter').answer).toContain('termakan') // KD4: dapat dimakan
    expect(getEntryById('imbuhan-se').answer).toContain('setiba') // KD4: sebaik-baik tiba di
  })
})

// Driver-verified on PRPM 2026-10-01; wordFamilies.js already glossed keamanan 'peace/security'.
describe('grammar.js — keamanan = peace/security', () => {
  it('keamanan = peace/security (Kamus Dewan: keadaan yg aman, kesentosaan, ketenteraman), not "safety" (= keselamatan)', () => {
    const d = IMBUHAN_DRILLS.find(x => x.id === 'suffix-kean-aman')
    expect(d.answer).toBe('keamanan')
    expect(d.meaning).toBe('peace/security')
    expect(d.meaning).not.toMatch(/safety/)
  })
})
