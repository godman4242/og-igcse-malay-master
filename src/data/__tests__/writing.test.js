import { describe, it, expect } from 'vitest'
import { KARANGAN_TEMPLATES } from '../writing'

// Guards the IGCSE 0546 "Surat Kiriman Rasmi" (formal letter) format taught in
// TemplatesView. The formal-letter layout is web-verified (Malaysian curriculum,
// DBP / Jabatan Perkhidmatan Awam convention):
//   Alamat Pengirim (TOP LEFT) → garisan melintang → Alamat Penerima (left)
//   → Tarikh (RIGHT, level with the recipient's address)
// The earlier data taught the INFORMAL layout (sender top-right, date before the
// recipient address) under the "formal letter" label — a confident-wrong format
// that costs format marks. These tests lock the correct order + placement.
describe('KARANGAN_TEMPLATES — Surat Kiriman Rasmi (formal letter) format', () => {
  const surat = KARANGAN_TEMPLATES.find(t => t.id === 'surat')

  it('exists and is labelled the formal letter', () => {
    expect(surat).toBeTruthy()
    expect(surat.titleEn).toMatch(/formal letter/i)
  })

  it("places the sender's address at the TOP LEFT, not the informal top-right", () => {
    const pengirim = surat.structure.find(s => s.section === 'Alamat Pengirim')
    expect(pengirim).toBeTruthy()
    expect(pengirim.hint).toMatch(/left/i)
    expect(pengirim.hint).not.toMatch(/right/i)
  })

  it("orders the recipient's address BEFORE the date (pengirim → penerima → tarikh)", () => {
    const sections = surat.structure.map(s => s.section)
    const iPenerima = sections.indexOf('Alamat Penerima')
    const iTarikh = sections.indexOf('Tarikh')
    expect(iPenerima).toBeGreaterThanOrEqual(0)
    expect(iTarikh).toBeGreaterThanOrEqual(0)
    expect(iPenerima).toBeLessThan(iTarikh)
  })

  it('places the date on the RIGHT (formal letter convention)', () => {
    const tarikh = surat.structure.find(s => s.section === 'Tarikh')
    expect(tarikh).toBeTruthy()
    expect(tarikh.hint).toMatch(/right/i)
  })
})
