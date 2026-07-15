import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { injectRouteMeta, genRobots, genSitemap } from '../seoHead.js'
import { ROUTE_META, SITE } from '../routeMeta.js'

// Read the REAL index.html so the transform is tested against the live shell —
// if the shell's head changes shape, this test guides the fix.
const SHELL = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')

describe('injectRouteMeta', () => {
  it('sets the route title, description and self-canonical (no trailing slash for sub-routes)', () => {
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/writing'], path: '/writing' })
    expect(out).toContain('<title>Writing Analyzer | IGCSE Malay Master</title>')
    expect(out).toContain('content="Analyze your IGCSE writing across 21 formats')
    expect(out).toContain(`href="${SITE.defaultBaseUrl}/writing"`)
    expect(out).toContain(`content="${SITE.defaultBaseUrl}/writing"`) // og:url
  })
  it('root canonical keeps the trailing slash', () => {
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/'], path: '/' })
    expect(out).toContain(`<link rel="canonical" href="${SITE.defaultBaseUrl}/"`)
  })
  it('sets per-route og:title / twitter:title', () => {
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/speaking'], path: '/speaking' })
    expect(out).toContain('property="og:title" content="Speaking Practice | IGCSE Malay Master"')
    expect(out).toContain('name="twitter:title" content="Speaking Practice | IGCSE Malay Master"')
  })
  it('marks utility routes noindex, content routes index', () => {
    const settings = injectRouteMeta(SHELL, { meta: ROUTE_META['/settings'], path: '/settings' })
    expect(settings).toContain('name="robots" content="noindex, nofollow"')
    const study = injectRouteMeta(SHELL, { meta: ROUTE_META['/study'], path: '/study' })
    expect(study).toContain('name="robots" content="index, follow"')
  })
  it('noindex:true forces noindex even on a content route', () => {
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/study'], path: '/study', noindex: true })
    expect(out).toContain('name="robots" content="noindex, nofollow"')
  })
  it('swaps the default host everywhere for a different baseUrl (og- mirror)', () => {
    const base = 'https://og-igcse-malay-master.vercel.app'
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/'], path: '/', baseUrl: base })
    expect(out).not.toContain('upg-igcse-malay-master')       // og:image, JSON-LD, canonical all swapped
    expect(out).toContain(`href="${base}/"`)
  })
  it('preserves the module script tag untouched', () => {
    const shell = '<html><head><title>x</title></head><body><script type="module" src="/assets/index-abc.js"></script></body></html>'
    const out = injectRouteMeta(shell, { meta: ROUTE_META['/study'], path: '/study' })
    expect(out).toContain('<script type="module" src="/assets/index-abc.js"></script>')
    expect(out).toContain('<title>Study | IGCSE Malay Master</title>')
  })
  it('inserts missing tags on a minimal shell (upsert, not just replace)', () => {
    const shell = '<html><head></head><body></body></html>'
    const out = injectRouteMeta(shell, { meta: ROUTE_META['/study'], path: '/study' })
    expect(out).toContain('<title>Study | IGCSE Malay Master</title>')
    expect(out).toContain('rel="canonical"')
    expect(out).toContain('name="description"')
  })
})

describe('genRobots', () => {
  it('indexable build allows all + points at the sitemap', () => {
    const r = genRobots({ baseUrl: SITE.defaultBaseUrl })
    expect(r).toContain('Allow: /')
    expect(r).toContain(`Sitemap: ${SITE.defaultBaseUrl}/sitemap.xml`)
  })
  it('noindex build disallows everything and omits the sitemap line', () => {
    const r = genRobots({ noindex: true })
    expect(r).toContain('Disallow: /')
    expect(r).not.toContain('Sitemap:')
  })
})

describe('genSitemap', () => {
  it('lists content routes with the base host and excludes utility routes', () => {
    const s = genSitemap({ baseUrl: SITE.defaultBaseUrl })
    expect(s).toContain('<?xml version="1.0"')
    expect(s).toContain(`<loc>${SITE.defaultBaseUrl}/study</loc>`)
    expect(s).toContain(`<loc>${SITE.defaultBaseUrl}/</loc>`)
    expect(s).not.toContain('/settings')
    expect(s).not.toContain('/import')
    expect(s).not.toContain('/mistakes')
  })
})
