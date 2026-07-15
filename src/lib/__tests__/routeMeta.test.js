import { describe, it, expect } from 'vitest'
import { ROUTE_META, metaForPath, SITE } from '../routeMeta.js'

// The 21 routes wired in src/App.jsx (the `*` catch-all redirects to `/`).
const ROUTES = ['/', '/study', '/roleplay', '/grammar', '/writing', '/import', '/settings',
  '/mistakes', '/word-families', '/cikgu', '/comprehension', '/pdf-reader', '/speaking',
  '/exam-rehearsal', '/listening', '/dictation', '/cloze-listening', '/smart-study',
  '/practice', '/saved-cloze', '/for-you']

describe('ROUTE_META', () => {
  it('covers exactly the 21 app routes', () => {
    expect(Object.keys(ROUTE_META).sort()).toEqual([...ROUTES].sort())
  })
  it('every entry has a non-empty name, title and description', () => {
    for (const [p, m] of Object.entries(ROUTE_META)) {
      expect(m.name, p).toBeTruthy()
      expect(m.title, p).toBeTruthy()
      expect(m.description, p).toBeTruthy()
    }
  })
  it('titles and descriptions are unique across routes', () => {
    const titles = Object.values(ROUTE_META).map(m => m.title)
    const descs = Object.values(ROUTE_META).map(m => m.description)
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descs).size).toBe(descs.length)
  })
  it('only settings/import/mistakes are noindex', () => {
    const noindex = Object.entries(ROUTE_META).filter(([, m]) => m.index === false).map(([p]) => p).sort()
    expect(noindex).toEqual(['/import', '/mistakes', '/settings'])
  })
  it('metaForPath falls back to home for unknown paths', () => {
    expect(metaForPath('/nope')).toBe(ROUTE_META['/'])
    expect(metaForPath('/study').name).toBe('Study')
  })
  it('SITE.defaultBaseUrl is the upg host with no trailing slash', () => {
    expect(SITE.defaultBaseUrl).toBe('https://upg-igcse-malay-master.vercel.app')
  })
})
